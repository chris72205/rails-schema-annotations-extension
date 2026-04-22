import * as path from 'path';
import * as vscode from 'vscode';

type PendingContent =
  | { type: 'annotation'; annotation: string; modelName: string }
  | { type: 'placeholder'; message: string };

export class AnnotationPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'railsSchemaAnnotations.schemaInfo';

  private view?: vscode.WebviewView;
  private pending: PendingContent = {
    type: 'placeholder',
    message: 'Open a Rails model file to see its schema annotation.',
  };

  show(): void {
    vscode.commands.executeCommand(`${AnnotationPanel.viewType}.focus`);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: false };
    this.flush();
  }

  showAnnotation(annotation: string, modelFilePath: string): void {
    this.pending = { type: 'annotation', annotation, modelName: path.basename(modelFilePath) };
    this.flush();
  }

  showPlaceholder(message = 'Open a Rails model file to see its schema annotation.'): void {
    this.pending = { type: 'placeholder', message };
    this.flush();
  }

  private flush(): void {
    if (!this.view) return;
    if (this.pending.type === 'annotation') {
      this.view.title = this.pending.modelName;
      this.view.webview.html = this.buildAnnotationHtml(this.pending.annotation, this.pending.modelName);
    } else {
      this.view.title = undefined;
      this.view.webview.html = this.buildPlaceholderHtml(this.pending.message);
    }
  }

  private buildAnnotationHtml(annotation: string, modelName: string): string {
    const escaped = this.escapeHtml(annotation);
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-editor-font-family, 'Menlo', 'Monaco', 'Courier New', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.5;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 8px 16px 16px;
      height: 100vh;
      overflow-y: auto;
    }
    .file-header {
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      padding: 6px 0;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
      margin-bottom: 10px;
    }
    pre {
      white-space: pre;
      color: var(--vscode-editorCodeLens-foreground, var(--vscode-descriptionForeground));
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }
  </style>
</head>
<body>
  <div class="file-header">${this.escapeHtml(modelName)}</div>
  <pre>${escaped}</pre>
</body>
</html>`;
  }

  private buildPlaceholderHtml(message: string): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-descriptionForeground);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
  </style>
</head>
<body>
  <span>${this.escapeHtml(message)}</span>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
