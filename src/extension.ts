import * as vscode from 'vscode';
import { AnnotationController } from './annotationController';
import { AnnotationPanel } from './annotationPanel';
import { AnnotationHoverProvider } from './hoverProvider';

let controller: AnnotationController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  const outputChannel = vscode.window.createOutputChannel('Rails Schema Annotations');
  const panel = new AnnotationPanel();
  const hoverProvider = new AnnotationHoverProvider();

  controller = new AnnotationController(
    workspaceRoot,
    context,
    outputChannel,
    panel,
    hoverProvider
  );

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(AnnotationPanel.viewType, panel),
    vscode.languages.registerHoverProvider(
      [
        { language: 'ruby', scheme: 'file' },
        { language: 'yaml', scheme: 'file' },
      ],
      hoverProvider
    ),
    vscode.commands.registerCommand('railsSchemaAnnotations.toggle', () => {
      controller?.toggle();
    }),
    vscode.commands.registerCommand('railsSchemaAnnotations.refresh', async () => {
      await controller?.refresh();
    }),
    vscode.commands.registerCommand('railsSchemaAnnotations.showPanel', () => {
      controller?.showPanel();
    }),
    vscode.commands.registerCommand('railsSchemaAnnotations.memoryReport', () => {
      const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
      const m = process.memoryUsage();
      outputChannel.appendLine('[Rails Schema Annotations] — Memory report (extension host process) —');
      outputChannel.appendLine(`  Heap used:  ${mb(m.heapUsed)}`);
      outputChannel.appendLine(`  Heap total: ${mb(m.heapTotal)}`);
      outputChannel.appendLine(`  RSS:        ${mb(m.rss)}`);
      outputChannel.appendLine(`  External:   ${mb(m.external)}`);
      outputChannel.show();
    }),
    controller
  );

  controller.activate(context).catch((err) => {
    outputChannel.appendLine(`[Rails Schema Annotations] Activation error: ${err}`);
  });
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
