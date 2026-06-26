import * as vscode from 'vscode';
import { ScanHistoryEntry, SecuritySummary } from '../types';
import { formatDateTime } from '../utils/date-format';
import { generateDashboardHtml } from './webview-html';

const HISTORY_KEY = 'shieldex.scanHistory';
const CACHE_KEY = 'shieldex.lastScan';
const MAX_HISTORY_ITEMS = 30;

export class DashboardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'shieldex.dashboard';

  private _view?: vscode.WebviewView;
  private _lastSummary?: SecuritySummary;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = generateDashboardHtml(
      webviewView.webview.cspSource,
    );

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'ready': {
          // Webview loaded, send persisted state
          const history = this.getHistory();
          this._view?.webview.postMessage({
            type: 'history',
            history,
          });

          // Send cached scan result if available
          const cached =
            this._lastSummary ||
            this._context.globalState.get<SecuritySummary>(CACHE_KEY);
          if (cached) {
            this._view?.webview.postMessage({
              type: 'scanResult',
              data: cached,
            });
          }
          break;
        }
        case 'scan':
          vscode.commands.executeCommand('shieldex.scanExtensions');
          break;
        case 'cancelScan':
          vscode.commands.executeCommand('shieldex.cancelScan');
          break;
        case 'export':
          vscode.commands.executeCommand('shieldex.pickHistoryExport');
          break;
        case 'navigate': {
          const extId = message.extensionId;
          if (extId) {
            vscode.commands.executeCommand('extension.open', extId);
          }
          break;
        }
        case 'saveHistory':
          this.setHistory(message.history);
          break;
        case 'requestClearHistory':
          void this.confirmClearHistory();
          break;
        case 'requestClearHistoryEntry':
          if (message.id) {
            void this.confirmClearHistoryEntry(message.id);
          }
          break;
      }
    });
  }

  updateResult(summary: SecuritySummary): void {
    this._lastSummary = summary;
    if (this._view) {
      this._view.webview.postMessage({ type: 'scanResult', data: summary });
    }
  }

  sendProgress(percent: number, text: string): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'scanProgress',
        percent,
        text,
      });
    }
  }

  sendScanStart(): void {
    if (this._view) {
      this._view.webview.postMessage({ type: 'scanStart' });
    }
  }

  sendScanEnd(): void {
    if (this._view) {
      this._view.webview.postMessage({ type: 'scanEnd' });
    }
  }

  addHistoryEntry(summary: SecuritySummary): void {
    const history = this.getHistory();
    history.unshift({
      id: summary.scannedAt || new Date().toISOString(),
      time: summary.scannedAt || new Date().toISOString(),
      total: summary.totalExtensions,
      high: summary.highRisk,
      critical: summary.criticalRisk,
      moderate: summary.moderateRisk,
      low: summary.lowRisk,
      summary,
    });
    this.setHistory(history.slice(0, MAX_HISTORY_ITEMS));
  }

  private getHistory(): ScanHistoryEntry[] {
    return this._context.globalState.get<ScanHistoryEntry[]>(HISTORY_KEY, []);
  }

  private setHistory(history: ScanHistoryEntry[]): void {
    this._context.globalState.update(HISTORY_KEY, history);
    if (this._view) {
      this._view.webview.postMessage({ type: 'history', history });
    }
  }

  private async confirmClearHistory(): Promise<void> {
    const picked = await vscode.window.showWarningMessage(
      'Clear all scan history?',
      { modal: true },
      'Clear',
    );
    if (picked !== 'Clear') return;
    this.setHistory([]);
  }

  private async confirmClearHistoryEntry(id: string): Promise<void> {
    const entry = this.getHistory().find((item) => (item.id || item.time) === id);
    const label = entry
      ? `${formatDateTime(entry.time)} (${entry.total} total, ${entry.high} high, ${entry.critical} critical)`
      : 'selected history entry';
    const picked = await vscode.window.showWarningMessage(
      `Clear history entry for ${label}?`,
      { modal: true },
      'Clear',
    );
    if (picked !== 'Clear') return;

    const history = this.getHistory().filter(
      (entry) => (entry.id || entry.time) !== id,
    );
    this.setHistory(history);
    if (this._view) {
      this._view.webview.postMessage({ type: 'historyEntryCleared', id });
    }
  }
}
