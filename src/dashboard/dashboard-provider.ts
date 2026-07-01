import { commands, workspace } from 'vscode';
import type {
  WebviewViewProvider,
  ExtensionContext,
  WebviewView,
  WebviewViewResolveContext,
  CancellationToken,
} from 'vscode';
import { ScanHistoryEntry, SecuritySummary } from '../types';
import { generateDashboardHtml } from './webview-html';
import { EXT_CONFIG } from '../config';

const HISTORY_KEY = `${EXT_CONFIG.name.toLowerCase()}.scanHistory`;
const CACHE_KEY = `${EXT_CONFIG.name.toLowerCase()}.lastScan`;

function getShortScanId(id: string): string {
  const str = String(id || 'ShieldX-Scan');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  let hex = Math.abs(hash).toString(16).substring(0, 6).toUpperCase();
  while (hex.length < 6) {
    hex = '0' + hex;
  }
  return `ShieldX-${hex}`;
}

export class DashboardProvider implements WebviewViewProvider {
  public static readonly viewType = `${EXT_CONFIG.name.toLowerCase()}.dashboard`;

  private _view?: WebviewView;
  private _lastSummary?: SecuritySummary;

  constructor(
    private readonly _context: ExtensionContext,
    private readonly _clearPersistedScanState?: () => Thenable<void> | void,
  ) {}

  resolveWebviewView(
    webviewView: WebviewView,
    _context: WebviewViewResolveContext,
    _token: CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'ready': {
          this.syncAllWebviewState();
          break;
        }
        case 'scan':
          commands.executeCommand(
            `${EXT_CONFIG.name.toLowerCase()}.scanExtensions`,
          );
          break;
        case 'cancelScan':
          commands.executeCommand(
            `${EXT_CONFIG.name.toLowerCase()}.cancelScan`,
          );
          break;
        case 'export':
          commands.executeCommand(
            `${EXT_CONFIG.name.toLowerCase()}.pickHistoryExport`,
          );
          break;
        case 'navigate': {
          const extId = message.extensionId;
          if (extId) {
            commands.executeCommand('extension.open', extId);
          }
          break;
        }
        case 'saveHistory':
          this.setHistory(message.history);
          break;
        case 'requestClearHistory':
          void this.executeClearHistory();
          break;
        case 'forceClearHistory':
          void this.executeClearHistory();
          break;
        case 'requestClearHistoryEntry':
          if (message.id) {
            this.executeClearHistoryEntry(message.id);
          }
          break;
        case 'forceClearHistoryEntry':
          if (message.id) {
            this.executeClearHistoryEntry(message.id);
          }
          break;
        case 'directExport':
          if (message.format) {
            void commands.executeCommand(
              `${EXT_CONFIG.name.toLowerCase()}.exportSpecificReport`,
              message.historyId,
              message.format,
            );
          }
          break;
        case 'requestSettings':
          this.sendSettings();
          break;
        case 'updateSetting':
          if (message.key) {
            void workspace
              .getConfiguration(EXT_CONFIG.name.toLowerCase())
              .update(message.key, message.value, true)
              .then(() => {
                this.sendSettings();
              });
          }
          break;
        case 'error':
          console.error('Webview Client Error:', message.error);
          break;
      }
    });

    webviewView.webview.html = generateDashboardHtml(
      webviewView.webview.cspSource,
    );

    this.syncAllWebviewState();
  }

  private syncAllWebviewState(): void {
    if (!this._view) return;
    const history = this.getHistory();
    this._view.webview.postMessage({
      type: 'history',
      history,
    });

    this.sendSettings();

    const cached =
      this._lastSummary ||
      this._context.globalState.get<SecuritySummary>(CACHE_KEY);
    if (cached) {
      this._view.webview.postMessage({
        type: 'scanResult',
        data: cached,
      });
    } else if (history.length > 0 && history[0].summary) {
      this.syncCurrentScanStateFromHistory(history);
    } else {
      this.clearCurrentScanState();
    }
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

  sendScanCancelled(): void {
    if (this._view) {
      this._view.webview.postMessage({ type: 'scanCancelled' });
    }
  }

  private sendSettings(): void {
    if (!this._view) return;
    const config = workspace.getConfiguration(EXT_CONFIG.name.toLowerCase());
    this._view.webview.postMessage({
      type: 'settingsData',
      settings: {
        autoScanOnStartup: config.get<boolean>('autoScanOnStartup', false),
        warnOnHighRisk: config.get<boolean>('warnOnHighRisk', true),
        minimumWarningLevel: config.get<string>('minimumWarningLevel', 'high'),
        scanNodeModules: config.get<boolean>('scanNodeModules', false),
        reportFormat: config.get<string>('reportFormat', 'markdown'),
        enableOsvScan: config.get<boolean>('enableOsvScan', true),
        maxHistoryItems: config.get<number>('maxHistoryItems', 10),
      },
    });
  }

  addHistoryEntry(summary: SecuritySummary): void {
    const history = this.getHistory();

    for (const entry of history) {
      if (entry.id && !entry.id.startsWith('ShieldX-')) {
        entry.id = getShortScanId(entry.id);
      }
    }

    const scannedAt = summary.scannedAt || new Date().toISOString();
    const newId = getShortScanId(scannedAt);
    history.unshift({
      id: newId,
      time: scannedAt,
      total: summary.totalExtensions,
      high: summary.highRisk,
      critical: summary.criticalRisk,
      moderate: summary.moderateRisk,
      low: summary.lowRisk,
      summary,
    });

    const config = workspace.getConfiguration(EXT_CONFIG.name.toLowerCase());
    const maxHistoryItems = config.get<number>('maxHistoryItems', 10);
    this.setHistory(history.slice(0, maxHistoryItems));
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

  private syncCurrentScanStateFromHistory(history: ScanHistoryEntry[]): void {
    const nextSummary = history[0]?.summary;
    if (!nextSummary) {
      this.clearCurrentScanState();
      return;
    }
    this._lastSummary = nextSummary;
    void this._context.globalState.update(CACHE_KEY, nextSummary);
    if (this._view) {
      this._view.webview.postMessage({ type: 'scanResult', data: nextSummary });
    }
  }

  private clearCurrentScanState(): void {
    this._lastSummary = undefined;
    void this._context.globalState.update(CACHE_KEY, undefined);
    if (this._view) {
      this._view.webview.postMessage({ type: 'scanCleared' });
    }
  }

  private async executeClearHistory(): Promise<void> {
    if (this._clearPersistedScanState) {
      await this._clearPersistedScanState();
    }
    this.clearCurrentScanState();
    this.setHistory([]);
  }

  private executeClearHistoryEntry(id: string): void {
    const history = this.getHistory().filter(
      (entry) => (entry.id || entry.time) !== id,
    );
    this.setHistory(history);
    this.syncCurrentScanStateFromHistory(history);
    if (this._view) {
      this._view.webview.postMessage({ type: 'historyEntryCleared', id });
    }
  }
}
