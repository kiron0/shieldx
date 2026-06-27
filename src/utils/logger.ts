import * as vscode from 'vscode';
import { EXT_CONFIG } from '../config';

const channel = vscode.window.createOutputChannel(EXT_CONFIG.name, {
  log: true,
});

export function info(message: string): void {
  channel.info(`[INFO] ${message}`);
}

export function warn(message: string): void {
  channel.warn(`[WARN] ${message}`);
}

export function error(message: string): void {
  channel.error(`[ERROR] ${message}`);
}

export function showChannel(): void {
  channel.show();
}
