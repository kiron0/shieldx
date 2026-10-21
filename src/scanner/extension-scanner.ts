import * as vscode from 'vscode';
import { ExtensionSecurityReport, SecuritySummary } from '../types';
import { InstalledExtension } from '../utils/extension-utils';
import { throwIfCancelled } from '../utils/cancellation';
import { info, warn } from '../utils/logger';
import { EXT_CONFIG } from '../config';
import { analyzeCode } from './code-analyzer';
import { analyzeDependencies } from './dependency-analyzer';
import { queryOsvVulnerabilities } from './osv-scanner';
import { analyzePackage } from './package-analyzer';
import { checkPublisherReputation } from './publisher-checker';
import { calculateRisk, generateRecommendation } from './risk-scorer';

export interface ScanOptions {
  osvEnabled?: boolean;
  includeNodeModules?: boolean;
}

export async function scanExtension(
  ext: InstalledExtension,
  token?: vscode.CancellationToken,
  options: ScanOptions = {},
): Promise<ExtensionSecurityReport> {
  info(`Scanning: ${ext.id}`);
  throwIfCancelled(token);

  const config = vscode.workspace.getConfiguration(
    EXT_CONFIG.name.toLowerCase(),
  );
  const osvEnabled =
    options.osvEnabled ?? config.get<boolean>('enableOsvScan', true);
  const includeNodeModules =
    options.includeNodeModules ?? config.get<boolean>('scanNodeModules', false);

  const packageResult = await analyzePackage(ext);
  throwIfCancelled(token);

  const codeResult = await analyzeCode(
    ext.installPath,
    packageResult.detectedCapabilities,
    { includeNodeModules },
  );
  throwIfCancelled(token);

  const [depResult, pubResult] = await Promise.all([
    analyzeDependencies(ext.installPath, packageResult.extensionDependencies),
    checkPublisherReputation(ext, token),
  ]);
  throwIfCancelled(token);

  const osvFactors: import('../types').RiskFactor[] = [];
  // Only shipped (runtime) dependencies matter: devDependencies are not
  // installed with the extension and would only add noise.
  const runtimeDeps = packageResult.extensionDependencies.filter(
    (dep) => !dep.isDev,
  );
  if (osvEnabled && runtimeDeps.length > 0) {
    try {
      const osvResults = await queryOsvVulnerabilities(runtimeDeps, token);
      osvFactors.push(...osvResults);
    } catch {
      void 0;
    }
  }
  throwIfCancelled(token);

  const allRiskFactors = [
    ...packageResult.riskFactors,
    ...codeResult.riskFactors,
    ...depResult.riskFactors,
    ...pubResult.riskFactors,
    ...osvFactors,
  ];
  const allTrustSignals = [
    ...packageResult.trustSignals,
    ...codeResult.trustSignals,
    ...depResult.trustSignals,
    ...pubResult.trustSignals,
  ];
  const capabilities = codeResult.detectedCapabilities;

  const { riskScore, riskLevel } = calculateRisk(
    allRiskFactors,
    allTrustSignals,
  );

  const recommendation = generateRecommendation(riskLevel, allRiskFactors);

  const report: ExtensionSecurityReport = {
    id: ext.id,
    name: ext.name,
    publisher: ext.publisher,
    version: ext.version,
    displayName: ext.displayName,
    description: ext.description,
    marketplaceId: ext.marketplaceId,
    category: ext.category,
    installPath: ext.installPath,
    iconDataUrl: ext.iconDataUrl,
    riskScore,
    riskLevel,
    riskFactors: allRiskFactors,
    trustSignals: allTrustSignals,
    detectedCapabilities: capabilities,
    extensionDependencies: packageResult.extensionDependencies,
    recommendation,
    scannedAt: new Date().toISOString(),
  };

  if (riskLevel === 'high' || riskLevel === 'critical') {
    warn(`${ext.id} = ${riskLevel.toUpperCase()} (score: ${riskScore})`);
  }

  return report;
}

const SCAN_CONCURRENCY = 4;

export async function scanAllExtensions(
  extensions: InstalledExtension[],
  onProgress?: (current: number, total: number, name: string) => void,
  token?: vscode.CancellationToken,
  options: ScanOptions = {},
): Promise<SecuritySummary> {
  const reports: ExtensionSecurityReport[] = [];
  const total = extensions.length;

  if (total === 0) {
    return {
      totalExtensions: 0,
      lowRisk: 0,
      moderateRisk: 0,
      highRisk: 0,
      criticalRisk: 0,
      reports,
      scannedAt: new Date().toISOString(),
      vscodeVersion: vscode.version,
    };
  }

  let nextIndex = 0;
  let completed = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      if (token?.isCancellationRequested) {
        throw new vscode.CancellationError();
      }
      const index = nextIndex++;
      if (index >= total) return;

      const ext = extensions[index];
      const report = await scanExtension(ext, token, options);
      reports.push(report);

      completed++;
      if (onProgress) {
        onProgress(completed, total, ext.displayName || ext.name);
      }
    }
  };

  const workerCount = Math.min(SCAN_CONCURRENCY, total);
  const workers = Array.from({ length: workerCount }, () => worker());
  const settled = await Promise.allSettled(workers);

  const failure = settled.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) {
    throw failure.reason;
  }

  reports.sort((a, b) => b.riskScore - a.riskScore);

  let lowRisk = 0;
  let moderateRisk = 0;
  let highRisk = 0;
  let criticalRisk = 0;
  for (const report of reports) {
    if (report.riskLevel === 'critical') criticalRisk++;
    else if (report.riskLevel === 'high') highRisk++;
    else if (report.riskLevel === 'moderate') moderateRisk++;
    else lowRisk++;
  }

  const summary: SecuritySummary = {
    totalExtensions: reports.length,
    lowRisk,
    moderateRisk,
    highRisk,
    criticalRisk,
    reports,
    scannedAt: new Date().toISOString(),
    vscodeVersion: vscode.version,
  };

  return summary;
}
