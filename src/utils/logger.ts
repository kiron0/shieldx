import { EXT_CONFIG } from '../config';

export type LogSink = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  show: () => void;
  dispose: () => void;
};

let sink: LogSink | null = null;
let usingConsole = false;

const consoleSink: LogSink = {
  // stdout is reserved for report output (CLI), logs go to stderr.
  info: (message) => console.error(`[${EXT_CONFIG.name}] ${message}`),
  warn: (message) => console.warn(`[${EXT_CONFIG.name}] ${message}`),
  error: (message) => console.error(`[${EXT_CONFIG.name}] ${message}`),
  show: () => undefined,
  dispose: () => undefined,
};

/**
 * Creates the editor output channel lazily. The scan core also runs outside
 * the editor (CLI), where `vscode` cannot be resolved, so logging falls back
 * to the console instead of failing at import time.
 */
function getSink(): LogSink {
  if (sink) return sink;
  sink = consoleSink;
  usingConsole = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode') as typeof import('vscode');
    sink = vscode.window.createOutputChannel(EXT_CONFIG.name, { log: true });
    usingConsole = false;
  } catch {
    // Not running inside the editor: keep the console sink.
  }
  return sink;
}

export function info(message: string): void {
  getSink().info(`[INFO] ${message}`);
}

export function warn(message: string): void {
  getSink().warn(`[WARN] ${message}`);
}

export function error(message: string): void {
  getSink().error(`[ERROR] ${message}`);
}

export function showChannel(): void {
  getSink().show();
}

export function disposeLogger(): void {
  if (sink && !usingConsole) sink.dispose();
  sink = null;
  usingConsole = false;
}
