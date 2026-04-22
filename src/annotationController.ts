import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { AnnotationCache, AnnotationRecord } from './annotationCache';
import { AnnotationPanel } from './annotationPanel';
import { ConfigManager } from './configManager';
import { DecorationProvider } from './decorationProvider';
import { AnnotationHoverProvider } from './hoverProvider';
import { RubyRunner } from './rubyRunner';

export const FILE_PATTERNS: ReadonlyArray<{ pattern: RegExp; suffix: 'model' | 'table' }> = [
  { pattern: /^app\/models\/(.+)\.rb$/, suffix: 'model' },
  { pattern: /^spec\/models\/(.+)_spec\.rb$/, suffix: 'model' },
  { pattern: /^test\/models\/(.+)_test\.rb$/, suffix: 'model' },
  { pattern: /^test\/unit\/(.+)_test\.rb$/, suffix: 'model' },
  { pattern: /^app\/serializers\/(.+)_serializer\.rb$/, suffix: 'model' },
  { pattern: /^spec\/serializers\/(.+)_serializer_spec\.rb$/, suffix: 'model' },
  { pattern: /^test\/serializers\/(.+)_serializer_test\.rb$/, suffix: 'model' },
  { pattern: /^(?:spec|test)\/factories\/(.+)_factory\.rb$/, suffix: 'model' },
  { pattern: /^(?:spec|test)\/factories\/(.+)\.rb$/, suffix: 'model' },
  { pattern: /^(?:spec|test)\/factories\/(.+)\.rb$/, suffix: 'table' },
  { pattern: /^(?:spec|test)\/exemplars\/(.+)_exemplar\.rb$/, suffix: 'model' },
  { pattern: /^(?:spec|test)\/blueprints\/(.+)_blueprint\.rb$/, suffix: 'model' },
  { pattern: /^(?:spec|test)\/fabricators\/(.+)_fabricator\.rb$/, suffix: 'model' },
  { pattern: /^(?:spec|test)\/fixtures\/(.+)\.yml$/, suffix: 'table' },
];

export class AnnotationController implements vscode.Disposable {
  private annotations: AnnotationRecord = {};
  private tableNameIndex: Map<string, string> = new Map();

  private cache: AnnotationCache;
  private configManager: ConfigManager;
  private decorationProvider: DecorationProvider;
  private hoverProvider: AnnotationHoverProvider;
  private rubyRunner: RubyRunner;
  private disposables: vscode.Disposable[] = [];
  private enabled = true;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor(
    private readonly workspaceRoot: string,
    private readonly context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
    private readonly panel: AnnotationPanel,
    hoverProvider: AnnotationHoverProvider
  ) {
    this.outputChannel = outputChannel;
    this.configManager = new ConfigManager(workspaceRoot);
    this.decorationProvider = new DecorationProvider();
    this.hoverProvider = hoverProvider;
    this.cache = new AnnotationCache(context);
    this.cache.load();
    this.rubyRunner = new RubyRunner(workspaceRoot, context.extensionPath, outputChannel);
    this.hoverProvider.setLookup((fsPath) => this.lookupAnnotation(fsPath));
  }

  async activate(_context: vscode.ExtensionContext): Promise<void> {
    this.enabled = this.configManager.getConfig().enabled;

    await this.refresh();

    const dbWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, 'db/{schema.rb,structure.sql}')
    );
    dbWatcher.onDidChange(() => this.scheduleRefresh());
    dbWatcher.onDidCreate(() => this.scheduleRefresh());
    this.disposables.push(dbWatcher);

    // Model file watcher catches self.table_name overrides being added/removed
    const modelWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, 'app/models/**/*.rb')
    );
    modelWatcher.onDidChange(() => this.scheduleRefresh());
    modelWatcher.onDidCreate(() => this.scheduleRefresh());
    modelWatcher.onDidDelete(() => this.scheduleRefresh());
    this.disposables.push(modelWatcher);

    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => this.applyToAllVisibleEditors()),
      vscode.window.onDidChangeActiveTextEditor((e) => this.updatePanel(e)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration('railsSchemaAnnotations')) return;
        this.enabled = this.configManager.getConfig().enabled;
        if (!this.enabled) {
          this.decorationProvider.clearAll();
          this.panel.showPlaceholder('Schema annotations are disabled.');
        } else {
          this.scheduleRefresh();
        }
      })
    );

    this.applyToAllVisibleEditors();
    this.updatePanel(vscode.window.activeTextEditor);
  }

  async refresh(): Promise<void> {
    if (!this.enabled) return;

    const schemaPath = this.findSchemaFile();
    if (!schemaPath) {
      this.outputChannel.appendLine('[Rails Schema Annotations] No schema.rb or structure.sql found.');
      return;
    }

    const sha = AnnotationCache.computeFileSha(schemaPath);
    if (!sha) return;

    const config = this.configManager.getConfig();
    const cacheKey = `${sha}:${configFingerprint(config)}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Object.keys(cached).length > 0) {
      this.outputChannel.appendLine(`[Rails Schema Annotations] Cache hit for SHA ${sha.slice(0, 8)}…`);
      this.applyAnnotations(cached);
      return;
    }

    this.outputChannel.appendLine(`[Rails Schema Annotations] Running annotaterb for SHA ${sha.slice(0, 8)}…`);
    const annotations = await this.rubyRunner.generateAnnotations(config);
    // Don't cache empty results — a Ruby failure shouldn't poison subsequent attempts
    if (Object.keys(annotations).length > 0) {
      this.cache.set(cacheKey, annotations);
    }
    this.applyAnnotations(annotations);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.decorationProvider.clearAll();
      this.panel.showPlaceholder('Schema annotations are disabled.');
    } else {
      this.refresh();
    }
    vscode.window.showInformationMessage(
      `Rails Schema Annotations: ${this.enabled ? 'enabled' : 'disabled'}`
    );
  }

  showPanel(): void {
    this.updatePanel(vscode.window.activeTextEditor);
    this.panel.show();
  }

  private findSchemaFile(): string | undefined {
    const schemaRb = path.join(this.workspaceRoot, 'db', 'schema.rb');
    if (fs.existsSync(schemaRb)) return schemaRb;

    const structureSql = path.join(this.workspaceRoot, 'db', 'structure.sql');
    if (fs.existsSync(structureSql)) return structureSql;

    return undefined;
  }

  private applyAnnotations(annotations: AnnotationRecord): void {
    this.annotations = annotations;
    this.tableNameIndex.clear();
    for (const text of Object.values(annotations)) {
      const table = parseTableName(text);
      if (table) this.tableNameIndex.set(table, text);
    }
    this.applyToAllVisibleEditors();
    this.updatePanel(vscode.window.activeTextEditor);
  }

  private lookupAnnotation(fsPath: string): string | undefined {
    const relative = path.relative(this.workspaceRoot, fsPath).replace(/\\/g, '/');

    for (const { pattern, suffix } of FILE_PATTERNS) {
      const m = relative.match(pattern);
      if (!m) continue;

      if (suffix === 'model') {
        const annotation = this.annotations[`app/models/${m[1]}.rb`];
        if (annotation) return annotation;
      } else {
        const tableName = m[1].replace(/\//g, '_');
        const annotation = this.tableNameIndex.get(tableName);
        if (annotation) return annotation;
      }
    }

    return undefined;
  }

  private applyToAllVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.applyDecorationToEditor(editor);
    }
  }

  private applyDecorationToEditor(editor: vscode.TextEditor): void {
    if (!this.enabled) { this.decorationProvider.clear(editor); return; }

    const annotation = this.lookupAnnotation(editor.document.uri.fsPath);
    if (!annotation) { this.decorationProvider.clear(editor); return; }

    const table = parseTableName(annotation);
    const summary = table
      ? `  # == Schema Information  (table: ${table})`
      : `  # == Schema Information`;
    this.decorationProvider.apply(editor, summary);
  }

  private updatePanel(editor: vscode.TextEditor | undefined): void {
    if (!this.enabled) { this.panel.showPlaceholder('Schema annotations are disabled.'); return; }
    if (!editor) { this.panel.showPlaceholder(); return; }

    const annotation = this.lookupAnnotation(editor.document.uri.fsPath);
    if (!annotation) { this.panel.showPlaceholder('No schema annotation found for this file.'); return; }

    this.panel.showAnnotation(annotation, editor.document.uri.fsPath);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.refresh(), 500);
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.disposables.forEach((d) => d.dispose());
    this.decorationProvider.dispose();
  }
}

export function parseTableName(annotation: string): string | undefined {
  return annotation.match(/^# Table name:\s*(\S+)/m)?.[1];
}

export function configFingerprint(config: import('./types').ExtensionConfig): string {
  const { enabled: _e, ...relevant } = config;
  return JSON.stringify(relevant);
}
