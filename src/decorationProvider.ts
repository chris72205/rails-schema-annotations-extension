import * as vscode from 'vscode';

export class DecorationProvider implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        fontStyle: 'italic',
        margin: '0 0 0 3em',
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    });
  }

  apply(editor: vscode.TextEditor, summaryText: string): void {
    const line0Length = editor.document.lineAt(0).text.length;
    editor.setDecorations(this.decorationType, [{
      range: new vscode.Range(0, 0, 0, line0Length),
      renderOptions: { after: { contentText: summaryText } },
    }]);
  }

  clear(editor: vscode.TextEditor): void {
    editor.setDecorations(this.decorationType, []);
  }

  clearAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.clear(editor);
    }
  }

  dispose(): void {
    this.decorationType.dispose();
  }
}
