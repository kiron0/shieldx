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
import { scanAllExtensions } from './scanner/extension-scanner';
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
import { fileExists, readJsonFile, writeJsonFile } from './utils/file-utils';
import { info, warn } from './utils/logger';
import { EXT_CONFIG } from './config';
import * as fs from 'fs';

let dashboardProvider: DashboardProvider;
let previousExtensionIds: Set<string> = new Set();
let activeScanCancellation: vscode.CancellationTokenSource | undefined;

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

export function activate(context: vscode.ExtensionContext): void {
  info(`${EXT_CONFIG.name} activated`);

  const welcomeShown = context.globalState.get<boolean>(
    WELCOME_SHOWN_KEY,
    false,
  );
  if (!welcomeShown) {
    showWelcomeMessage();
    context.globalState.update(WELCOME_SHOWN_KEY, true);
  }

  dashboardProvider = new DashboardProvider(context, () =>
    clearPersistedScanState(context),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardProvider.viewType,
      dashboardProvider,
    ),
  );

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
        const summary = loadFromCache(context)?.summary;
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
        const policy = loadPolicy() || { allowedExtensions: [] };
        if (!policy.allowedExtensions) policy.allowedExtensions = [];
        if (!policy.allowedExtensions.includes(ext.id)) {
          policy.allowedExtensions.push(ext.id);
          writePolicy(policy);
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
        const policy = loadPolicy() || { blockedExtensions: [] };
        if (!policy.blockedExtensions) policy.blockedExtensions = [];
        if (!policy.blockedExtensions.includes(ext.id)) {
          policy.blockedExtensions.push(ext.id);
          writePolicy(policy);
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
      () => {
        const policy = loadPolicy();
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

  const cached = loadFromCache(context);
  if (cached) {
    previousExtensionIds = new Set(cached.previousIds);
  }

  const autoScan = vscode.workspace
    .getConfiguration(EXT_CONFIG.name.toLowerCase())
    .get<boolean>('autoScanOnStartup', true);
  if (autoScan) {
    setTimeout(async () => {
      await runScan(context);
      if (context.globalState.get<boolean>(FIRST_RUN_KEY, true)) {
        context.globalState.update(FIRST_RUN_KEY, false);
      }
    }, 2000);
  }

  previousExtensionIds = new Set(getInstalledExtensions().map((e) => e.id));

  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      checkForNewExtensions(context);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      checkWorkspaceTrust(context);
    }),
  );

  checkWorkspaceTrust(context);
}

export function deactivate(): void {
  info(`${EXT_CONFIG.name} deactivated`);
}

function showWelcomeMessage(): void {
  vscode.window
    .showInformationMessage(
      `${EXT_CONFIG.name}: Welcome! ${EXT_CONFIG.name} helps you understand the security risks of your VS Code extensions.`,
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

        const prevSummary = loadFromCache(context)?.summary || null;

        const policy = loadPolicy();

        const summary = await scanAllExtensions(
          extensions,
          (current, total, name) => {
            const pct = Math.round((current / total) * 100);
            dashboardProvider.sendProgress(pct, `Scanning ${name}...`);
          },
          scanToken,
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

        saveToCache(context, summary);
        context.globalState.update(CACHE_KEY, summary);
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

        previousExtensionIds = new Set(extensions.map((e) => e.id));

        info(
          `Note: ${EXT_CONFIG.name} is a risk scanner, not a perfect malware detector. Some threats may not be detected.`,
        );
      },
    );
  } catch (err) {
    if (err instanceof vscode.CancellationError) {
      info(`${EXT_CONFIG.name} scan cancelled.`);
      vscode.window.showInformationMessage(
        `${EXT_CONFIG.name}: Scan cancelled.`,
      );
    } else {
      throw err;
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
  const currentIds = new Set(getInstalledExtensions().map((e) => e.id));

  const newIds: string[] = [];
  for (const id of currentIds) {
    if (!previousExtensionIds.has(id)) {
      newIds.push(id);
    }
  }

  if (newIds.length > 0) {
    info(`New extensions detected: ${newIds.join(', ')}`);

    const config = vscode.workspace.getConfiguration(
      EXT_CONFIG.name.toLowerCase(),
    );
    const warnOnHigh = config.get<boolean>('warnOnHighRisk', true);

    if (warnOnHigh) {
      const summary = await scanAllExtensions(getInstalledExtensions());

      const newReports = summary.reports.filter((r) => newIds.includes(r.id));
      const riskyNew = newReports.filter(
        (r) => r.riskLevel === 'high' || r.riskLevel === 'critical',
      );

      if (riskyNew.length > 0) {
        for (const ext of riskyNew) {
          const action = await vscode.window.showWarningMessage(
            `${EXT_CONFIG.name}: New extension "${ext.displayName || ext.name}" is ${toTitleCase(ext.riskLevel)} risk (score: ${ext.riskScore}). ${ext.recommendation}`,
            'Show in Sidebar',
            'Dismiss',
          );
          if (action === 'Show in Sidebar') {
            focusSidebar();
          }
        }
      }

      saveToCache(context, summary);
      context.globalState.update(CACHE_KEY, summary);
      dashboardProvider.addHistoryEntry(summary);
      dashboardProvider.updateResult(summary);
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
    vscode.window.showErrorMessage(`Failed to export report: ${err}`);
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
      loadFromCache(context)?.summary ||
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
  return formatDateTime(entry.time);
}

function loadPolicy(): ShieldXPolicy | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return null;

  for (const folder of workspaceFolders) {
    const policyPath = path.join(
      folder.uri.fsPath,
      `.${EXT_CONFIG.name.toLowerCase()}.json`,
    );
    const policy = readJsonFile<ShieldXPolicy>(policyPath);
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

function writePolicy(policy: ShieldXPolicy): void {
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
  writeJsonFile(policyPath, policy);
  vscode.window.showInformationMessage(`Policy saved to ${policyPath}`);
}

function checkPolicyCompliance(
  summary: SecuritySummary,
  policy: ShieldXPolicy,
): void {
  const issues: string[] = [];

  if (policy.blockedExtensions) {
    for (const blocked of policy.blockedExtensions) {
      const found = summary.reports.find((r) => r.id === blocked);
      if (found) {
        issues.push(`BLOCKED extension installed: ${blocked}`);
      }
    }
  }

  if (policy.allowedExtensions) {
    for (const report of summary.reports) {
      if (!policy.allowedExtensions.includes(report.id)) {
        issues.push(`Extension "${report.id}" is not in the allowlist`);
      }
    }
  }

  if (policy.maxRiskLevel) {
    const levels = ['low', 'moderate', 'high', 'critical'];
    const maxIdx = levels.indexOf(policy.maxRiskLevel);
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
  let hasSensitiveFiles = false;

  for (const folder of workspaceFolders) {
    for (const sf of sensitiveFiles) {
      if (fileExists(path.join(folder.uri.fsPath, sf))) {
        hasSensitiveFiles = true;
        break;
      }
    }
    if (hasSensitiveFiles) break;
  }

  if (hasSensitiveFiles) {
    const summary =
      loadFromCache(context)?.summary ||
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

function saveToCache(
  context: vscode.ExtensionContext,
  summary: SecuritySummary,
): void {
  const stored: StoredScan = {
    summary,
    previousIds: [...previousExtensionIds],
    version: CACHE_VERSION,
  };
  context.globalState.update(CACHE_KEY, summary);

  try {
    const cachePath = path.join(
      context.globalStorageUri.fsPath,
      'scan-cache.json',
    );
    writeJsonFile(cachePath, stored);
  } catch {
    void 0;
  }
}

async function clearPersistedScanState(
  context: vscode.ExtensionContext,
): Promise<void> {
  await context.globalState.update(CACHE_KEY, undefined);
  try {
    const cachePath = path.join(
      context.globalStorageUri.fsPath,
      'scan-cache.json',
    );
    if (fileExists(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  } catch {
    void 0;
  }
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function loadFromCache(context: vscode.ExtensionContext): StoredScan | null {
  try {
    const cachePath = path.join(
      context.globalStorageUri.fsPath,
      'scan-cache.json',
    );
    if (fileExists(cachePath)) {
      const cached = readJsonFile<StoredScan>(cachePath);
      if (cached && cached.version === CACHE_VERSION) {
        return cached;
      }
    }
  } catch {
    void 0;
  }

  const summary = context.globalState.get<SecuritySummary>(CACHE_KEY);
  if (summary) {
    return { summary, previousIds: [], version: CACHE_VERSION };
  }
  return null;
}
