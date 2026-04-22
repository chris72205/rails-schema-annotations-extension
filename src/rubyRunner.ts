import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionConfig } from './types';

export class RubyRunner {
  private readonly scriptPath: string;
  private readonly outputChannel: vscode.OutputChannel;

  constructor(
    private readonly workspaceRoot: string,
    extensionPath: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.scriptPath = path.join(extensionPath, 'bin', 'generate_annotations.rb');
    this.outputChannel = outputChannel;
  }

  async generateAnnotations(config: ExtensionConfig): Promise<Record<string, string>> {
    const args = this.buildArgs(config);
    const rubyBin = this.findRubyBin();
    const bundleBin = path.join(path.dirname(rubyBin), 'bundle');
    const cmd = fs.existsSync(bundleBin)
      ? `"${bundleBin}" exec ruby "${this.scriptPath}" ${args.join(' ')}`
      : `"${rubyBin}" "${this.scriptPath}" ${args.join(' ')}`;

    this.outputChannel.appendLine(`[Rails Schema Annotations] Ruby: ${rubyBin}`);
    this.outputChannel.appendLine(`[Rails Schema Annotations] Running: ${cmd}`);
    this.outputChannel.appendLine(`[Rails Schema Annotations] CWD: ${this.workspaceRoot}`);

    return new Promise((resolve) => {
      cp.exec(cmd, { cwd: this.workspaceRoot, timeout: 120_000 }, (error, stdout, stderr) => {
        if (stderr) {
          this.outputChannel.appendLine(`[stderr] ${stderr.trim()}`);
        }
        if (error) {
          this.outputChannel.appendLine(`[error] ${error.message}`);
          vscode.window.showWarningMessage(
            'Rails Schema Annotations: Failed to generate annotations. Check the Output panel for details.'
          );
          resolve({});
          return;
        }

        const trimmed = stdout.trim();
        if (!trimmed) { resolve({}); return; }

        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'object' && parsed !== null) {
            this.outputChannel.appendLine(
              `[Rails Schema Annotations] Got annotations for ${Object.keys(parsed).length} model(s).`
            );
            resolve(parsed as Record<string, string>);
          } else {
            resolve({});
          }
        } catch {
          this.outputChannel.appendLine(
            `[Rails Schema Annotations] Failed to parse JSON: ${trimmed.substring(0, 200)}`
          );
          resolve({});
        }
      });
    });
  }

  private findRubyBin(): string {
    const home = process.env.HOME || '';

    const rubyVersionFile = path.join(this.workspaceRoot, '.ruby-version');
    let version: string | undefined;
    try {
      if (fs.existsSync(rubyVersionFile)) {
        version = fs.readFileSync(rubyVersionFile, 'utf8').trim();
      }
    } catch { /* ignore */ }

    if (version) {
      const candidates = [
        path.join(home, '.rbenv', 'versions', version, 'bin', 'ruby'),
        path.join(home, '.rvm', 'rubies', `ruby-${version}`, 'bin', 'ruby'),
        path.join(home, '.asdf', 'installs', 'ruby', version, 'bin', 'ruby'),
        path.join(home, '.local', 'share', 'mise', 'installs', 'ruby', version, 'bin', 'ruby'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          this.outputChannel.appendLine(`[Rails Schema Annotations] Found Ruby ${version} at ${candidate}`);
          return candidate;
        }
      }
    }

    // .ruby-version candidates exhausted — ask rbenv directly
    const rbenvBin = path.join(home, '.rbenv', 'bin', 'rbenv');
    if (fs.existsSync(rbenvBin)) {
      try {
        const result = cp.execSync(`"${rbenvBin}" which ruby`, {
          cwd: this.workspaceRoot, timeout: 5000, encoding: 'utf8',
        }).trim();
        if (result && fs.existsSync(result)) {
          this.outputChannel.appendLine(`[Rails Schema Annotations] rbenv which ruby → ${result}`);
          return result;
        }
      } catch { /* ignore */ }
    }

    this.outputChannel.appendLine('[Rails Schema Annotations] Falling back to system ruby');
    return 'ruby';
  }

  private buildArgs(config: ExtensionConfig): string[] {
    const args: string[] = [];
    if (!config.showIndexes)             args.push('--no-indexes');
    if (config.showForeignKeys)          args.push('--show-foreign-keys');
    if (config.showCompleteForeignKeys)  args.push('--show-complete-foreign-keys');
    if (config.showCheckConstraints)     args.push('--show-check-constraints');
    if (config.showVirtualColumns)       args.push('--show-virtual-columns');
    if (config.ignoreColumns)            args.push(`--ignore-columns=${config.ignoreColumns}`);
    if (config.classifiedSort)           args.push('--classified-sort');
    if (config.sort)                     args.push('--sort');
    if (config.simpleIndexes)            args.push('--simple-indexes');
    if (config.formatMarkdown)           args.push('--format-markdown');
    if (config.formatRdoc)               args.push('--format-rdoc');
    if (config.formatYard)               args.push('--format-yard');
    if (config.withComment)              args.push('--with-comment');
    return args;
  }
}
