import * as vscode from 'vscode';

export function throwIfCancelled(token?: vscode.CancellationToken): void {
  if (token?.isCancellationRequested) {
    throw new vscode.CancellationError();
  }
}
