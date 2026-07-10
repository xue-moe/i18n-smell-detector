import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('i18n-smell-detector.check', async () => {
    const terminal = vscode.window.createTerminal('i18n Smell Detector');
    terminal.show();
    terminal.sendText('npx i18n-smell-detector check --fail-on none');
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
