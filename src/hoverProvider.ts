import * as vscode from 'vscode';

export class AnnotationHoverProvider implements vscode.HoverProvider, vscode.Disposable {
  private lookup: (fsPath: string) => string | undefined = () => undefined;

  setLookup(fn: (fsPath: string) => string | undefined): void {
    this.lookup = fn;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.Hover | undefined {
    if (position.line !== 0) return undefined;

    const annotation = this.lookup(document.uri.fsPath);
    if (!annotation) return undefined;

    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.supportHtml = false;
    md.appendCodeblock(annotation, 'ruby');
    md.appendMarkdown('\n\n[Open in Schema Info panel](command:railsSchemaAnnotations.showPanel)');

    return new vscode.Hover(md, document.lineAt(0).range);
  }

  dispose(): void {}
}
