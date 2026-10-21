import * as path from 'path';
import * as vscode from 'vscode';
import { DashboardProvider } from './dashboard/dashboard-provider';
import {
  generateCsvReport,
  generateHtmlReport,
  generateJsonReport,
  generateMarkdownReport,
  generateSarifReport,
} from './reports/markdown-report';
import { isPdfExportAvailable, renderHtmlToPdf } from './reports/pdf-report';
import { scanAllExtensions, scanExtension } from './scanner/extension-scanner';
import { compareScans } from './scanner/history-comparison';
import {
  ScanHistoryEntry,
  SecuritySummary,
  ShieldXPolicy,
  StoredScan,
} from './types';
import {
  getInstalledExtensions,
  InstalledExtension,
} from './utils/extension-utils';
import { formatDateStamp, formatDateTime } from './utils/date-format';
import {
  fileExistsAsync,
  readJsonFileAsync,
  writeJsonFileAsync,
} from './utils/file-utils';
import { info, warn, disposeLogger } from './utils/logger';
import { getShortScanId } from './utils/scan-id';
import { stripIcons } from './utils/summary-utils';
import { EXT_CONFIG } from './config';

let dashboardProvider: DashboardProvider;
let previousExtensionIds: Set<string> = new Set();
let activeScanCancellation: vscode.CancellationTokenSource | undefined;
let extensionChangeTimeout: NodeJS.Timeout | undefined;
let startupScanTimeout: NodeJS.Timeout | undefined;
let cachedScan: StoredScan | null | undefined;

function focusSidebar(): void {
  vscode.commands.executeCommand(
    `workbench.view.extension.${EXT_CONFIG.name.toLowerCase()}`,
  );
}

const CACHE_KEY = `${EXT_CONFIG.name.toLowerCase()}.lastScan`;
const HISTORY_KEY = `${EXT_CONFIG.name.toLowerCase()}.scanHistory`;
const FIRST_RUN_KEY = `${EXT_CONFIG.name.toLowerCase()}.firstRun`;
const WELCOME_SHOWN_KEY = `${EXT_CONFIG.name.toLowerCase()}.welcomeShown`;
const METRICS_KEY = `${EXT_CONFIG.name.toLowerCase()}.metrics`;
const CACHE_VERSION = 1;

interface Metrics {
  scansRun: number;
  reportsExported: number;
  highRiskDetected: number;
  lastScanTime?: string;
}

function getMetrics(context: vscode.ExtensionContext): Metrics {
  return context.globalState.get<Metrics>(METRICS_KEY, {
    scansRun: 0,
    reportsExported: 0,
    highRiskDetected: 0,
  });
}

function updateMetrics(
  context: vscode.ExtensionContext,
  updates: Partial<Metrics>,
): void {
  const metrics = { ...getMetrics(context), ...updates };
  context.globalState.update(METRICS_KEY, metrics);
}

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  info(`${EXT_CONFIG.name} activated`);

  const welcomeShown = context.globalState.get<boolean>(
    WELCOME_SHOWN_KEY,
    false,
  );
  if (!welcomeShown) {
    showWelcomeMessage();
    context.globalState.update(WELCOME_SHOWN_KEY, true);
  }

  dashboardProvider = new DashboardProvider(
    context,
    () => clearPersistedScanState(context),
    (summary) => {
      cachedScan = summary
        ? {
            summary,
            previousIds: [...previousExtensionIds],
            version: CACHE_VERSION,
          }
        : null;
    },
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardProvider.viewType,
      dashboardProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );
  context.subscriptions.push({ dispose: () => dashboardProvider.dispose() });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.scanExtensions`,
      async () => {
        await runScan(context);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.openDashboard`,
      () => {
        vscode.commands.executeCommand(
          `${EXT_CONFIG.name.toLowerCase()}.scanExtensions`,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.exportReport`,
      async (format?: string) => {
        const summary = (await loadFromCache(context))?.summary;
        if (!summary) {
          const fallback = context.globalState.get<SecuritySummary>(CACHE_KEY);
          if (!fallback) {
            vscode.window.showWarningMessage(
              'No scan results available. Run a scan first.',
            );
            return;
          }
          await exportReport(context, fallback, format);
          return;
        }
        await exportReport(context, summary, format);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.pickExportReportFormat`,
      async () => {
        const format = await pickExportFormat();
        if (!format) return;
        await vscode.commands.executeCommand(
          `${EXT_CONFIG.name.toLowerCase()}.exportReport`,
          format,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.pickHistoryExport`,
      async () => {
        const summary = await pickHistorySummary(context);
        if (!summary) return;
        const format = await pickExportFormat();
        if (!format) return;
        await exportReport(context, summary, format);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.exportSpecificReport`,
      async (historyId: string, format: string) => {
        let summary: SecuritySummary | undefined;
        if (historyId === 'latest') {
          summary = context.globalState.get<SecuritySummary>(CACHE_KEY);
        } else {
          const history = context.globalState.get<ScanHistoryEntry[]>(
            HISTORY_KEY,
            [],
          );
          const entry = history.find((e) => (e.id || e.time) === historyId);
          summary = entry?.summary;
        }

        if (!summary) {
          vscode.window.showWarningMessage(
            'No scan results found for the selected history.',
          );
          return;
        }

        await exportReport(context, summary, format);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.rescanExtension`,
      async () => {
        vscode.commands.executeCommand(
          `${EXT_CONFIG.name.toLowerCase()}.scanExtensions`,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.cancelScan`,
      () => {
        activeScanCancellation?.cancel();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.addToAllowlist`,
      async () => {
        const ext = await pickExtension();
        if (!ext) return;
        const policy = (await loadPolicy()) || { allowedExtensions: [] };
        if (!policy.allowedExtensions) policy.allowedExtensions = [];
        if (!policy.allowedExtensions.includes(ext.id)) {
          policy.allowedExtensions.push(ext.id);
          await writePolicy(policy);
          vscode.window.showInformationMessage(
            `${EXT_CONFIG.name}: Added "${ext.displayName || ext.name}" to allowlist.`,
          );
        } else {
          vscode.window.showInformationMessage(
            `"${ext.displayName || ext.name}" already in allowlist.`,
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.addToBlocklist`,
      async () => {
        const ext = await pickExtension();
        if (!ext) return;
        const policy = (await loadPolicy()) || { blockedExtensions: [] };
        if (!policy.blockedExtensions) policy.blockedExtensions = [];
        if (!policy.blockedExtensions.includes(ext.id)) {
          policy.blockedExtensions.push(ext.id);
          await writePolicy(policy);
          vscode.window.showWarningMessage(
            `${EXT_CONFIG.name}: Added "${ext.displayName || ext.name}" to blocklist.`,
          );
        } else {
          vscode.window.showInformationMessage(
            `"${ext.displayName || ext.name}" already in blocklist.`,
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.showPolicy`,
      async () => {
        const policy = await loadPolicy();
        if (!policy) {
          vscode.window.showInformationMessage(
            `${EXT_CONFIG.name}: No policy file (.${EXT_CONFIG.name.toLowerCase()}.json) found in workspace.`,
          );
          return;
        }
        const content = JSON.stringify(policy, null, 2);
        vscode.workspace
          .openTextDocument({ content, language: 'json' })
          .then((doc) => {
            vscode.window.showTextDocument(doc);
          });
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXT_CONFIG.name.toLowerCase()}.scanVulnerabilities`,
      async () => {
        vscode.window.showInformationMessage(
          `${EXT_CONFIG.name}: OSV scan will run on next extension scan.`,
        );

        await runScan(context);
      },
    ),
  );

  const cached = await loadFromCache(context);
  const currentExtensionIds = getInstalledExtensions().map((e) => e.id);

  if (cached && cached.previousIds.length > 0) {
    previousExtensionIds = new Set(cached.previousIds);
  } else {
    previousExtensionIds = new Set(currentExtensionIds);
  }

  const autoScan = vscode.workspace
    .getConfiguration(EXT_CONFIG.name.toLowerCase())
    .get<boolean>('autoScanOnStartup', false);
  if (autoScan) {
    startupScanTimeout = setTimeout(async () => {
      startupScanTimeout = undefined;
      await runScan(context);
      if (context.globalState.get<boolean>(FIRST_RUN_KEY, true)) {
        context.globalState.update(FIRST_RUN_KEY, false);
      }
    }, 2000);
  } else if (cached) {
    // Extensions can be installed while the editor is closed. The cached id
    // list is the baseline, so an incremental scan can pick those up.
    const changedWhileClosed =
      currentExtensionIds.length !== previousExtensionIds.size ||
      currentExtensionIds.some((id) => !previousExtensionIds.has(id));
    if (changedWhileClosed) {
      startupScanTimeout = setTimeout(() => {
        startupScanTimeout = undefined;
        void checkForNewExtensions(context);
      }, 2000);
    }
  }

  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      if (extensionChangeTimeout) {
        clearTimeout(extensionChangeTimeout);
      }
      extensionChangeTimeout = setTimeout(() => {
        void checkForNewExtensions(context);
      }, 1000);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void checkWorkspaceTrust(context);
    }),
  );

  void checkWorkspaceTrust(context);
}

export function deactivate(): void {
  if (extensionChangeTimeout) {
    clearTimeout(extensionChangeTimeout);
    extensionChangeTimeout = undefined;
  }
  if (startupScanTimeout) {
    clearTimeout(startupScanTimeout);
    startupScanTimeout = undefined;
  }
  activeScanCancellation?.dispose();
  activeScanCancellation = undefined;
  info(`${EXT_CONFIG.name} deactivated`);
  disposeLogger();
}

function showWelcomeMessage(): void {
  vscode.window
    .showInformationMessage(
      `${EXT_CONFIG.name}: Welcome! ${EXT_CONFIG.name} helps you understand the security risks of your extensions.`,
      'Open Sidebar',
    )
    .then((action) => {
      if (action === 'Open Sidebar') {
        focusSidebar();
      }
    });
}

async function runScan(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration(
    EXT_CONFIG.name.toLowerCase(),
  );
  let shouldOfferSidebar = false;
  let riskyExtensionCount = 0;
  if (activeScanCancellation) {
    vscode.window.showInformationMessage(
      `${EXT_CONFIG.name}: Scan already running.`,
    );
    return;
  }

  dashboardProvider.sendScanStart();
  activeScanCancellation = new vscode.CancellationTokenSource();

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${EXT_CONFIG.name}: Scanning extensions...`,
        cancellable: true,
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => activeScanCancellation?.cancel());
        const scanToken = activeScanCancellation?.token;
        const extensions = getInstalledExtensions();
        info(`Found ${extensions.length} installed extensions`);

        const prevSummary = (await loadFromCache(context))?.summary || null;

        const policy = await loadPolicy();

        const summary = await scanAllExtensions(
          extensions,
          (current, total, name) => {
            const pct = Math.round((current / total) * 100);
            dashboardProvider.sendProgress(pct, `Scanning ${name}...`);
          },
          scanToken,
          {
            osvEnabled: config.get<boolean>('enableOsvScan', true),
          },
        );

        const diff = compareScans(prevSummary, summary);
        info(`Scan diff: ${diff.summary}`);
        if (diff.riskLevelChanges.length > 0) {
          for (const change of diff.riskLevelChanges) {
            warn(
              `Risk level changed: ${change.extensionId} ${change.oldLevel} → ${change.newLevel}`,
            );
          }
        }

        if (policy) {
          checkPolicyCompliance(summary, policy);
        }

        // Keep the id baseline in sync before persisting, otherwise the cached
        // id list lags one scan behind and offline changes get missed.
        previousExtensionIds = new Set(extensions.map((e) => e.id));

        await saveToCache(context, summary);
        dashboardProvider.addHistoryEntry(summary);

        dashboardProvider.updateResult(summary);

        const metrics = getMetrics(context);
        updateMetrics(context, {
          scansRun: metrics.scansRun + 1,
          highRiskDetected:
            metrics.highRiskDetected + summary.highRisk + summary.criticalRisk,
          lastScanTime: new Date().toISOString(),
        });

        const msg = `Scanned ${summary.totalExtensions} extensions: ${summary.lowRisk} low, ${summary.moderateRisk} moderate, ${summary.highRisk} high, ${summary.criticalRisk} critical`;
        info(msg);

        if (summary.highRisk > 0 || summary.criticalRisk > 0) {
          const warnOnHigh = config.get<boolean>('warnOnHighRisk', true);
          const minLevel = config.get<string>('minimumWarningLevel', 'high');

          if (warnOnHigh) {
            const levels = ['moderate', 'high', 'critical'];
            const minIdx = levels.indexOf(minLevel);

            const shouldWarn =
              (minIdx <= levels.indexOf('moderate') &&
                summary.moderateRisk > 0) ||
              (minIdx <= levels.indexOf('high') && summary.highRisk > 0) ||
              (minIdx <= levels.indexOf('critical') &&
                summary.criticalRisk > 0);

            if (shouldWarn) {
              shouldOfferSidebar = true;
              riskyExtensionCount = summary.highRisk + summary.criticalRisk;
            }
          }
        }

        info(
          `Note: ${EXT_CONFIG.name} is a risk scanner, not a perfect malware detector. Some threats may not be detected.`,
        );
      },
    );
  } catch (err) {
    if (err instanceof vscode.CancellationError) {
      dashboardProvider.sendScanCancelled();
      info(`${EXT_CONFIG.name} scan cancelled.`);
      vscode.window.showInformationMessage(
        `${EXT_CONFIG.name}: Scan cancelled.`,
      );
    } else {
      const message = err instanceof Error ? err.message : String(err);
      warn(`Scan failed: ${message}`);
      vscode.window.showErrorMessage(
        `${EXT_CONFIG.name}: Scan failed. ${message}`,
      );
    }
  } finally {
    activeScanCancellation?.dispose();
    activeScanCancellation = undefined;
    dashboardProvider.sendScanEnd();
  }

  if (shouldOfferSidebar) {
    const action = await vscode.window.showWarningMessage(
      `${EXT_CONFIG.name}: ${riskyExtensionCount} risky extensions found.`,
      'Show in Sidebar',
    );
    if (action === 'Show in Sidebar') {
      focusSidebar();
    }
  }
}

async function checkForNewExtensions(
  context: vscode.ExtensionContext,
): Promise<void> {
  const currentExtensions = getInstalledExtensions();
  const currentIds = new Set(currentExtensions.map((e) => e.id));

  const newIds: string[] = [];
  for (const id of currentIds) {
    if (!previousExtensionIds.has(id)) {
      newIds.push(id);
    }
  }

  const removedIds: string[] = [];
  for (const id of previousExtensionIds) {
    if (!currentIds.has(id)) {
      removedIds.push(id);
    }
  }

  if (newIds.length > 0 || removedIds.length > 0) {
    info(
      `Extension changes detected: ${newIds.length} new, ${removedIds.length} removed.`,
    );

    const stored = await loadFromCache(context);
    const summary = stored ? stored.summary : null;

    if (summary) {
      let newReports: import('./types').ExtensionSecurityReport[] = [];
      if (newIds.length > 0) {
        const newIdSet = new Set(newIds);
        const osvEnabled = vscode.workspace
          .getConfiguration(EXT_CONFIG.name.toLowerCase())
          .get<boolean>('enableOsvScan', true);
        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `${EXT_CONFIG.name}: Scanning new extensions...`,
              cancellable: true,
            },
            async (_progress, token) => {
              const scanPromise = Promise.all(
                currentExtensions
                  .filter((ext) => newIdSet.has(ext.id))
                  .map((ext) => scanExtension(ext, token, { osvEnabled })),
              );
              newReports = await scanPromise;
            },
          );
        } catch (err) {
          if (err instanceof vscode.CancellationError) {
            info(`${EXT_CONFIG.name}: Incremental scan cancelled.`);
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          warn(`Incremental scan failed: ${message}`);
          vscode.window.showErrorMessage(
            `${EXT_CONFIG.name}: Incremental scan failed. ${message}`,
          );
          return;
        }
      }

      if (removedIds.length > 0) {
        const removedIdSet = new Set(removedIds);
        summary.reports = summary.reports.filter(
          (r) => !removedIdSet.has(r.id),
        );
      }

      if (newReports.length > 0) {
        const newReportIds = new Set(newReports.map((r) => r.id));
        summary.reports = [
          ...newReports,
          ...summary.reports.filter((r) => !newReportIds.has(r.id)),
        ];
      }

      summary.totalExtensions = summary.reports.length;
      let lowRisk = 0;
      let moderateRisk = 0;
      let highRisk = 0;
      let criticalRisk = 0;
      for (const report of summary.reports) {
        if (report.riskLevel === 'critical') criticalRisk++;
        else if (report.riskLevel === 'high') highRisk++;
        else if (report.riskLevel === 'moderate') moderateRisk++;
        else lowRisk++;
      }
      summary.lowRisk = lowRisk;
      summary.moderateRisk = moderateRisk;
      summary.highRisk = highRisk;
      summary.criticalRisk = criticalRisk;
      summary.scannedAt = new Date().toISOString();
      summary.reports.sort((a, b) => b.riskScore - a.riskScore);

      await saveToCache(context, summary);
      dashboardProvider.updateResult(summary);

      const config = vscode.workspace.getConfiguration(
        EXT_CONFIG.name.toLowerCase(),
      );
      const warnOnHigh = config.get<boolean>('warnOnHighRisk', true);
      if (warnOnHigh && newReports.length > 0) {
        const riskyNew = newReports.filter(
          (r) => r.riskLevel === 'high' || r.riskLevel === 'critical',
        );
        if (riskyNew.length > 0) {
          const details = riskyNew
            .map(
              (ext) =>
                `"${ext.displayName || ext.name}" (${toTitleCase(ext.riskLevel)}, score ${ext.riskScore})`,
            )
            .join(', ');
          const action = await vscode.window.showWarningMessage(
            `${EXT_CONFIG.name}: ${riskyNew.length} new extension(s) flagged: ${details}.`,
            'Show in Sidebar',
            'Dismiss',
          );
          if (action === 'Show in Sidebar') {
            focusSidebar();
          }
        }
      }
    } else {
      await runScan(context);
    }

    previousExtensionIds = currentIds;
  }
}

async function exportReport(
  context: vscode.ExtensionContext,
  summary: SecuritySummary,
  format?: string,
): Promise<void> {
  const config = vscode.workspace.getConfiguration(
    EXT_CONFIG.name.toLowerCase(),
  );
  const fmt = format || config.get<string>('reportFormat', 'markdown');
  const configuredPdfBrowserPath =
    config.get<string>('pdfBrowserPath')?.trim() || undefined;

  const extMap: Record<string, string> = {
    markdown: 'md',
    json: 'json',
    html: 'html',
    pdf: 'pdf',
    csv: 'csv',
    sarif: 'sarif.json',
  };
  const actualFormat =
    fmt === 'pdf' && !isPdfExportAvailable(configuredPdfBrowserPath)
      ? 'html'
      : fmt;
  const actualExt = extMap[actualFormat] || 'md';

  const defaultUri = vscode.Uri.file(
    `${EXT_CONFIG.name.toLowerCase()}-report-${formatDateStamp(new Date())}.${actualExt}`,
  );

  const filterMap: Record<string, string[]> = {
    md: ['md'],
    json: ['json'],
    html: ['html'],
    pdf: ['pdf'],
    csv: ['csv'],
    'sarif.json': ['json'],
  };

  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      [actualExt.toUpperCase()]: filterMap[actualExt] || [actualExt],
      'All Files': ['*'],
    },
  });

  if (!uri) return;

  try {
    let content: string;
    switch (actualFormat) {
      case 'json':
        content = generateJsonReport(
          summary as unknown as Record<string, unknown>,
        );
        break;
      case 'html':
        content = generateHtmlReport(summary);
        break;
      case 'pdf':
        await renderHtmlToPdf(
          generateHtmlReport(summary),
          uri.fsPath,
          configuredPdfBrowserPath,
        );
        content = '';
        break;
      case 'csv':
        content = generateCsvReport(summary);
        break;
      case 'sarif':
        content = JSON.stringify(
          generateSarifReport(
            summary as unknown as { reports: any[]; scannedAt: string },
          ),
          null,
          2,
        );
        break;
      default:
        content = generateMarkdownReport(summary);
    }

    if (actualFormat !== 'pdf') {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    }
    if (fmt === 'pdf' && actualFormat !== 'pdf') {
      vscode.window.showWarningMessage(
        `PDF export unavailable on this machine. Exported HTML instead to ${uri.fsPath}. Set ${EXT_CONFIG.name.toLowerCase()}.pdfBrowserPath to enable exact PDF export.`,
      );
    }
    vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);

    const metrics = getMetrics(context);
    updateMetrics(context, { reportsExported: metrics.reportsExported + 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to export report: ${message}`);
  }
}

async function pickExportFormat(): Promise<string | undefined> {
  const configuredPdfBrowserPath =
    vscode.workspace
      .getConfiguration(EXT_CONFIG.name.toLowerCase())
      .get<string>('pdfBrowserPath')
      ?.trim() || undefined;
  const pdfAvailable = isPdfExportAvailable(configuredPdfBrowserPath);
  const items: Array<vscode.QuickPickItem & { format: string }> = [
    {
      label: 'Markdown',
      description: '.md',
      detail: 'Readable report for docs, PRs, sharing',
      format: 'markdown',
    },
    {
      label: 'JSON',
      description: '.json',
      detail: 'Raw structured data',
      format: 'json',
    },
    {
      label: 'HTML',
      description: '.html',
      detail: 'Browser-viewable report',
      format: 'html',
    },
    {
      label: 'CSV',
      description: '.csv',
      detail: 'Spreadsheet/table import',
      format: 'csv',
    },
    {
      label: 'SARIF',
      description: '.sarif.json',
      detail: 'Static analysis format for security tools',
      format: 'sarif',
    },
  ];

  if (pdfAvailable) {
    items.splice(3, 0, {
      label: 'PDF',
      description: '.pdf',
      detail: 'Exact HTML-to-PDF via installed Chrome/Chromium browser',
      format: 'pdf',
    });
  }

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select export format',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  return picked?.format;
}

async function pickHistorySummary(
  context: vscode.ExtensionContext,
): Promise<SecuritySummary | undefined> {
  const history = context.globalState.get<ScanHistoryEntry[]>(HISTORY_KEY, []);
  if (history.length === 0) {
    return (
      (await loadFromCache(context))?.summary ||
      context.globalState.get<SecuritySummary>(CACHE_KEY)
    );
  }

  const items = history.map((entry) => ({
    label: formatHistoryLabel(entry),
    description: `${entry.total} total`,
    detail: `${entry.high} high, ${entry.critical} critical`,
    summary: entry.summary,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select scan history to export',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  return picked?.summary;
}

function formatHistoryLabel(entry: ScanHistoryEntry): string {
  const hash =
    entry.id && entry.id.startsWith('ShieldX-')
      ? entry.id
      : getShortScanId(entry.id || entry.time);
  return `${hash} (${formatDateTime(entry.time)})`;
}

async function loadPolicy(): Promise<ShieldXPolicy | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return null;

  for (const folder of workspaceFolders) {
    const policyPath = path.join(
      folder.uri.fsPath,
      `.${EXT_CONFIG.name.toLowerCase()}.json`,
    );
    const policy = await readJsonFileAsync<ShieldXPolicy>(policyPath);
    if (policy) return policy;
  }

  return null;
}

async function pickExtension(): Promise<InstalledExtension | undefined> {
  const extensions = getInstalledExtensions();
  const items = extensions.map((e) => ({
    label: e.displayName || e.name,
    description: `${e.publisher} v${e.version}`,
    detail: e.id,
    extension: e,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an extension',
    matchOnDetail: true,
    matchOnDescription: true,
  });
  return picked?.extension;
}

async function writePolicy(policy: ShieldXPolicy): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Open a workspace first to manage policies.',
    );
    return;
  }
  const policyPath = path.join(
    workspaceFolders[0].uri.fsPath,
    `.${EXT_CONFIG.name.toLowerCase()}.json`,
  );
  await writeJsonFileAsync(policyPath, policy);
  vscode.window.showInformationMessage(`Policy saved to ${policyPath}`);
}

function checkPolicyCompliance(
  summary: SecuritySummary,
  policy: ShieldXPolicy,
): void {
  const issues: string[] = [];

  if (policy.blockedExtensions) {
    const blocked = new Set(policy.blockedExtensions);
    for (const report of summary.reports) {
      if (blocked.has(report.id)) {
        issues.push(`BLOCKED extension installed: ${report.id}`);
      }
    }
  }

  if (policy.allowedExtensions && policy.allowedExtensions.length > 0) {
    const allowed = new Set(policy.allowedExtensions);
    for (const report of summary.reports) {
      if (!allowed.has(report.id)) {
        issues.push(`Extension "${report.id}" is not in the allowlist`);
      }
    }
  }

  if (policy.maxRiskLevel) {
    const levels = ['low', 'moderate', 'high', 'critical'];
    const maxIdx = levels.indexOf(policy.maxRiskLevel);
    if (maxIdx >= 0) {
      const violating = summary.reports.filter((r) => {
        const idx = levels.indexOf(r.riskLevel);
        return idx > maxIdx;
      });

      if (violating.length > 0) {
        issues.push(
          `${violating.length} extension(s) exceed max risk level "${policy.maxRiskLevel}"`,
        );
      }
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      warn(`Policy violation: ${issue}`);
    }
    vscode.window
      .showWarningMessage(
        `${EXT_CONFIG.name}: Policy violations found.`,
        'Show in Sidebar',
      )
      .then((action) => {
        if (action === 'Show in Sidebar') focusSidebar();
      });
  }
}

async function checkWorkspaceTrust(
  context: vscode.ExtensionContext,
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production',
    'private.key',
    'id_rsa',
    'credentials.json',
    'secrets.json',
  ];

  const checks = workspaceFolders.flatMap((folder) =>
    sensitiveFiles.map((sf) =>
      fileExistsAsync(path.join(folder.uri.fsPath, sf)),
    ),
  );
  const results = await Promise.all(checks);
  const hasSensitiveFiles = results.some(Boolean);

  if (hasSensitiveFiles) {
    const summary =
      (await loadFromCache(context))?.summary ||
      context.globalState.get<SecuritySummary>(CACHE_KEY);

    if (summary) {
      const riskyCount = summary.reports.filter(
        (r) => r.riskLevel === 'high' || r.riskLevel === 'critical',
      ).length;

      if (riskyCount > 0) {
        vscode.window
          .showInformationMessage(
            `${EXT_CONFIG.name}: This workspace contains sensitive files. ${riskyCount} high-risk extension(s) are active. Consider reviewing them.`,
            'Show in Sidebar',
          )
          .then((action) => {
            if (action === 'Show in Sidebar') {
              focusSidebar();
            }
          });
      }
    }
  }
}

async function saveToCache(
  context: vscode.ExtensionContext,
  summary: SecuritySummary,
): Promise<void> {
  const stored: StoredScan = {
    summary: stripIcons(summary),
    previousIds: [...previousExtensionIds],
    version: CACHE_VERSION,
  };
  cachedScan = stored;

  await context.globalState.update(CACHE_KEY, stored.summary);

  try {
    const cachePath = path.join(
      context.globalStorageUri.fsPath,
      'scan-cache.json',
    );
    await writeJsonFileAsync(cachePath, stored);
  } catch {
    void 0;
  }
}

async function clearPersistedScanState(
  context: vscode.ExtensionContext,
): Promise<void> {
  cachedScan = null;
  await context.globalState.update(CACHE_KEY, undefined);
  try {
    const cachePath = path.join(
      context.globalStorageUri.fsPath,
      'scan-cache.json',
    );
    if (await fileExistsAsync(cachePath)) {
      await vscode.workspace.fs.delete(vscode.Uri.file(cachePath));
    }
  } catch {
    void 0;
  }
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

async function loadFromCache(
  context: vscode.ExtensionContext,
): Promise<StoredScan | null> {
  if (cachedScan !== undefined) {
    return cachedScan;
  }

  try {
    const cachePath = path.join(
      context.globalStorageUri.fsPath,
      'scan-cache.json',
    );
    if (await fileExistsAsync(cachePath)) {
      const cached = await readJsonFileAsync<StoredScan>(cachePath);
      if (cached && cached.version === CACHE_VERSION) {
        cachedScan = cached;
        return cached;
      }
    }
  } catch {
    void 0;
  }

  const summary = context.globalState.get<SecuritySummary>(CACHE_KEY);
  if (summary) {
    cachedScan = { summary, previousIds: [], version: CACHE_VERSION };
    return cachedScan;
  }

  cachedScan = null;
  return null;
}
