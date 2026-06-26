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
import { scanAllExtensions } from './scanner/extension-scanner';
import { compareScans } from './scanner/history-comparison';
import {
  ScanHistoryEntry,
  SecuritySummary,
  ShieldexPolicy,
  StoredScan,
} from './types';
import {
  getInstalledExtensions,
  InstalledExtension,
} from './utils/extension-utils';
import { fileExists, readJsonFile, writeJsonFile } from './utils/file-utils';
import { info, warn } from './utils/logger';

let dashboardProvider: DashboardProvider;
let previousExtensionIds: Set<string> = new Set();
let activeScanCancellation: vscode.CancellationTokenSource | undefined;

function focusSidebar(): void {
  vscode.commands.executeCommand('workbench.view.extension.shieldex');
}

const CACHE_KEY = 'shieldex.lastScan';
const HISTORY_KEY = 'shieldex.scanHistory';
const FIRST_RUN_KEY = 'shieldex.firstRun';
const WELCOME_SHOWN_KEY = 'shieldex.welcomeShown';
const METRICS_KEY = 'shieldex.metrics';
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
  info('Shieldex activated');

  // Show welcome on first install
  const welcomeShown = context.globalState.get<boolean>(
    WELCOME_SHOWN_KEY,
    false,
  );
  if (!welcomeShown) {
    showWelcomeMessage();
    context.globalState.update(WELCOME_SHOWN_KEY, true);
  }

  // Register dashboard
  dashboardProvider = new DashboardProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardProvider.viewType,
      dashboardProvider,
    ),
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.scanExtensions', async () => {
      await runScan(context);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.openDashboard', () => {
      vscode.commands.executeCommand('shieldex.scanExtensions');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'shieldex.exportReport',
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
      'shieldex.pickExportReportFormat',
      async () => {
        const format = await pickExportFormat();
        if (!format) return;
        await vscode.commands.executeCommand('shieldex.exportReport', format);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.pickHistoryExport', async () => {
      const summary = await pickHistorySummary(context);
      if (!summary) return;
      const format = await pickExportFormat();
      if (!format) return;
      await exportReport(context, summary, format);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.rescanExtension', async () => {
      vscode.commands.executeCommand('shieldex.scanExtensions');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.cancelScan', () => {
      activeScanCancellation?.cancel();
    }),
  );

  // Allowlist/blocklist policy commands
  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.addToAllowlist', async () => {
      const ext = await pickExtension();
      if (!ext) return;
      const policy = loadPolicy() || { allowedExtensions: [] };
      if (!policy.allowedExtensions) policy.allowedExtensions = [];
      if (!policy.allowedExtensions.includes(ext.id)) {
        policy.allowedExtensions.push(ext.id);
        writePolicy(policy);
        vscode.window.showInformationMessage(
          `Shieldex: Added "${ext.displayName || ext.name}" to allowlist.`,
        );
      } else {
        vscode.window.showInformationMessage(
          `"${ext.displayName || ext.name}" already in allowlist.`,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.addToBlocklist', async () => {
      const ext = await pickExtension();
      if (!ext) return;
      const policy = loadPolicy() || { blockedExtensions: [] };
      if (!policy.blockedExtensions) policy.blockedExtensions = [];
      if (!policy.blockedExtensions.includes(ext.id)) {
        policy.blockedExtensions.push(ext.id);
        writePolicy(policy);
        vscode.window.showWarningMessage(
          `Shieldex: Added "${ext.displayName || ext.name}" to blocklist.`,
        );
      } else {
        vscode.window.showInformationMessage(
          `"${ext.displayName || ext.name}" already in blocklist.`,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('shieldex.showPolicy', () => {
      const policy = loadPolicy();
      if (!policy) {
        vscode.window.showInformationMessage(
          'Shieldex: No policy file (.shieldex.json) found in workspace.',
        );
        return;
      }
      const content = JSON.stringify(policy, null, 2);
      vscode.workspace
        .openTextDocument({ content, language: 'json' })
        .then((doc) => {
          vscode.window.showTextDocument(doc);
        });
    }),
  );

  // OSV vulnerability scan command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'shieldex.scanVulnerabilities',
      async () => {
        vscode.window.showInformationMessage(
          'Shieldex: OSV scan will run on next extension scan.',
        );
        // OSV scan is integrated into the scan pipeline via dependency-analyzer
        await runScan(context);
      },
    ),
  );

  // Load cached scan if available
  const cached = loadFromCache(context);
  if (cached) {
    previousExtensionIds = new Set(cached.previousIds);
  }

  // Auto-scan on startup
  const autoScan = vscode.workspace
    .getConfiguration('shieldex')
    .get<boolean>('autoScanOnStartup', true);
  if (autoScan) {
    setTimeout(async () => {
      await runScan(context);
      if (context.globalState.get<boolean>(FIRST_RUN_KEY, true)) {
        context.globalState.update(FIRST_RUN_KEY, false);
      }
    }, 2000);
  }

  // Track extensions
  previousExtensionIds = new Set(getInstalledExtensions().map((e) => e.id));

  // Watch for extension changes
  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      checkForNewExtensions(context);
    }),
  );

  // Workspace trust
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      checkWorkspaceTrust(context);
    }),
  );

  checkWorkspaceTrust(context);
}

export function deactivate(): void {
  info('Shieldex deactivated');
}

function showWelcomeMessage(): void {
  vscode.window
    .showInformationMessage(
      'Shieldex: Welcome! Shieldex helps you understand the security risks of your VS Code extensions.',
      'Open Sidebar',
    )
    .then((action) => {
      if (action === 'Open Sidebar') {
        focusSidebar();
      }
    });
}

async function runScan(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('shieldex');
  if (activeScanCancellation) {
    vscode.window.showInformationMessage('Shieldex: Scan already running.');
    return;
  }

  dashboardProvider.sendScanStart();
  activeScanCancellation = new vscode.CancellationTokenSource();

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Shieldex: Scanning extensions...',
        cancellable: true,
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => activeScanCancellation?.cancel());
        const scanToken = activeScanCancellation?.token;
        const extensions = getInstalledExtensions();
        info(`Found ${extensions.length} installed extensions`);

        // Load previous scan for comparison
        const prevSummary = loadFromCache(context)?.summary || null;

        // Check workspace policy
        const policy = loadPolicy();

        const summary = await scanAllExtensions(
          extensions,
          (current, total, name) => {
            const pct = Math.round((current / total) * 100);
            dashboardProvider.sendProgress(pct, `Scanning ${name}...`);
          },
          scanToken,
        );

        // Historical comparison
        const diff = compareScans(prevSummary, summary);
        info(`Scan diff: ${diff.summary}`);
        if (diff.riskLevelChanges.length > 0) {
          for (const change of diff.riskLevelChanges) {
            warn(
              `Risk level changed: ${change.extensionId} ${change.oldLevel} → ${change.newLevel}`,
            );
          }
        }

        // Apply policy checks
        if (policy) {
          checkPolicyCompliance(summary, policy);
        }

        // Store scan
        saveToCache(context, summary);
        context.globalState.update(CACHE_KEY, summary);
        dashboardProvider.addHistoryEntry(summary);

        // Update dashboard with diff info
        dashboardProvider.updateResult(summary);

        // Update metrics
        const metrics = getMetrics(context);
        updateMetrics(context, {
          scansRun: metrics.scansRun + 1,
          highRiskDetected:
            metrics.highRiskDetected + summary.highRisk + summary.criticalRisk,
          lastScanTime: new Date().toISOString(),
        });

        // Show summary
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
              const action = await vscode.window.showWarningMessage(
                `Shieldex: ${summary.highRisk + summary.criticalRisk} risky extensions found.`,
                'Show in Sidebar',
              );
              if (action === 'Show in Sidebar') {
                focusSidebar();
              }
            }
          }
        }

        previousExtensionIds = new Set(extensions.map((e) => e.id));

        info(
          'Note: Shieldex is a risk scanner, not a perfect malware detector. Some threats may not be detected.',
        );
      },
    );
  } catch (err) {
    if (err instanceof vscode.CancellationError) {
      info('Shieldex scan cancelled.');
      vscode.window.showInformationMessage('Shieldex: Scan cancelled.');
    } else {
      throw err;
    }
  } finally {
    activeScanCancellation?.dispose();
    activeScanCancellation = undefined;
    dashboardProvider.sendScanEnd();
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

    const config = vscode.workspace.getConfiguration('shieldex');
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
            `Shieldex: New extension "${ext.displayName || ext.name}" is ${ext.riskLevel.toUpperCase()} risk (score: ${ext.riskScore}). ${ext.recommendation}`,
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
  const fmt =
    format ||
    vscode.workspace
      .getConfiguration('shieldex')
      .get<string>('reportFormat', 'markdown');

  const extMap: Record<string, string> = {
    markdown: 'md',
    json: 'json',
    html: 'html',
    csv: 'csv',
    sarif: 'sarif.json',
  };
  const ext = extMap[fmt] || 'md';

  const defaultUri = vscode.Uri.file(
    `shieldex-report-${new Date().toISOString().split('T')[0]}.${ext}`,
  );

  const filterMap: Record<string, string[]> = {
    md: ['md'],
    json: ['json'],
    html: ['html'],
    csv: ['csv'],
    'sarif.json': ['json'],
  };

  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      [ext.toUpperCase()]: filterMap[ext] || [ext],
      'All Files': ['*'],
    },
  });

  if (!uri) return;

  try {
    let content: string;
    switch (fmt) {
      case 'json':
        content = generateJsonReport(
          summary as unknown as Record<string, unknown>,
        );
        break;
      case 'html':
        content = generateHtmlReport(summary);
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

    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);

    // Track export metric
    const metrics = getMetrics(context);
    updateMetrics(context, { reportsExported: metrics.reportsExported + 1 });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to export report: ${err}`);
  }
}

async function pickExportFormat(): Promise<string | undefined> {
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
  const dt = new Date(entry.time);
  return dt.toLocaleString();
}

function loadPolicy(): ShieldexPolicy | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return null;

  for (const folder of workspaceFolders) {
    const policyPath = path.join(folder.uri.fsPath, '.shieldex.json');
    const policy = readJsonFile<ShieldexPolicy>(policyPath);
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

function writePolicy(policy: ShieldexPolicy): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Open a workspace first to manage policies.',
    );
    return;
  }
  const policyPath = path.join(
    workspaceFolders[0].uri.fsPath,
    '.shieldex.json',
  );
  writeJsonFile(policyPath, policy);
  vscode.window.showInformationMessage(`Policy saved to ${policyPath}`);
}

function checkPolicyCompliance(
  summary: SecuritySummary,
  policy: ShieldexPolicy,
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
        `Shieldex: Policy violations found.`,
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
            `Shieldex: This workspace contains sensitive files. ${riskyCount} high-risk extension(s) are active. Consider reviewing them.`,
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
    // non-critical
  }
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
    // non-critical
  }

  const summary = context.globalState.get<SecuritySummary>(CACHE_KEY);
  if (summary) {
    return { summary, previousIds: [], version: CACHE_VERSION };
  }
  return null;
}
