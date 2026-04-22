export const workspace = {
  getConfiguration: (_section: string) => ({
    get: <T>(_key: string, defaultValue: T): T => defaultValue,
  }),
  createFileSystemWatcher: () => ({
    onDidChange: () => ({ dispose: () => {} }),
    onDidCreate: () => ({ dispose: () => {} }),
    onDidDelete: () => ({ dispose: () => {} }),
    dispose: () => {},
  }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
  workspaceFolders: undefined,
};

export const window = {
  createOutputChannel: () => ({
    appendLine: () => {},
    show: () => {},
    dispose: () => {},
  }),
  createTextEditorDecorationType: () => ({ dispose: () => {} }),
  visibleTextEditors: [] as any[],
  activeTextEditor: undefined as any,
  onDidChangeVisibleTextEditors: () => ({ dispose: () => {} }),
  onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
  showWarningMessage: () => Promise.resolve(undefined),
  showInformationMessage: () => Promise.resolve(undefined),
  registerWebviewViewProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: (_id: string, _handler: (...args: any[]) => any) => ({ dispose: () => {} }),
  executeCommand: () => Promise.resolve(undefined),
};

export const languages = {
  registerHoverProvider: () => ({ dispose: () => {} }),
};

export class Uri {
  static file(path: string) { return { fsPath: path, scheme: 'file' }; }
}

export class RelativePattern {
  constructor(public base: string, public pattern: string) {}
}

export class ThemeColor {
  constructor(public id: string) {}
}

export enum DecorationRangeBehavior {
  ClosedOpen = 0,
  OpenOpen = 1,
  ClosedClosed = 2,
  OpenClosed = 3,
}

export class Range {
  constructor(
    public startLine: number,
    public startCharacter: number,
    public endLine: number,
    public endCharacter: number
  ) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class MarkdownString {
  isTrusted = false;
  supportHtml = false;
  value = '';
  constructor(_value?: string, _supportThemeIcons?: boolean) {}
  appendCodeblock(value: string, _language?: string) { this.value += value; return this; }
  appendMarkdown(value: string) { this.value += value; return this; }
}

export class Hover {
  constructor(public contents: any, public range?: any) {}
}

export class CancellationToken {
  isCancellationRequested = false;
  onCancellationRequested = () => ({ dispose: () => {} });
}
