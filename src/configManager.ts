import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionConfig } from './types';

export class ConfigManager {
  constructor(private readonly workspaceRoot: string) {}

  getConfig(): ExtensionConfig {
    const vs = vscode.workspace.getConfiguration('railsSchemaAnnotations');

    const config: ExtensionConfig = {
      enabled:                  vs.get('enabled', true),
      showIndexes:              vs.get('showIndexes', true),
      showForeignKeys:          vs.get('showForeignKeys', true),
      showCompleteForeignKeys:  vs.get('showCompleteForeignKeys', false),
      showCheckConstraints:     vs.get('showCheckConstraints', true),
      showVirtualColumns:       vs.get('showVirtualColumns', true),
      ignoreColumns:            vs.get('ignoreColumns', ''),
      classifiedSort:           vs.get('classifiedSort', false),
      sort:                     vs.get('sort', false),
      simpleIndexes:            vs.get('simpleIndexes', false),
      formatMarkdown:           vs.get('formatMarkdown', false),
      formatRdoc:               vs.get('formatRdoc', false),
      formatYard:               vs.get('formatYard', false),
      withComment:              vs.get('withComment', false),
    };

    const dotAnnotateRb = path.join(this.workspaceRoot, '.annotaterb');
    if (fs.existsSync(dotAnnotateRb)) {
      try {
        this.applyDotAnnotateRbOverrides(fs.readFileSync(dotAnnotateRb, 'utf8'), config);
      } catch { /* ignore unreadable config */ }
    }

    return config;
  }

  private applyDotAnnotateRbOverrides(content: string, config: ExtensionConfig): void {
    const bool = (key: string): boolean | undefined => {
      const m = content.match(new RegExp(`^${key}:\\s*(true|false)`, 'm'));
      return m ? m[1] === 'true' : undefined;
    };
    const str = (key: string): string | undefined => {
      const m = content.match(new RegExp(`^${key}:\\s*(.+)`, 'm'));
      return m ? m[1].trim() : undefined;
    };

    const apply = <K extends keyof ExtensionConfig>(
      key: K, value: ExtensionConfig[K] | undefined
    ) => { if (value !== undefined) config[key] = value; };

    apply('showIndexes',             bool('show_indexes'));
    apply('showForeignKeys',         bool('show_foreign_keys'));
    apply('showCompleteForeignKeys', bool('show_complete_foreign_keys'));
    apply('showCheckConstraints',    bool('show_check_constraints'));
    apply('showVirtualColumns',      bool('show_virtual_columns'));
    apply('ignoreColumns',           str('ignore_columns'));
    apply('classifiedSort',          bool('classified_sort'));
    apply('sort',                    bool('sort'));
    apply('simpleIndexes',           bool('simple_indexes'));
    apply('formatMarkdown',          bool('format_markdown'));
    apply('formatRdoc',              bool('format_rdoc'));
    apply('formatYard',              bool('format_yard'));
    apply('withComment',             bool('with_comment'));
  }
}
