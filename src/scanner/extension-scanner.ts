import * as vscode from 'vscode';
import { ExtensionSecurityReport, SecuritySummary } from '../types';
import { InstalledExtension } from '../utils/extension-utils';
import { throwIfCancelled } from '../utils/cancellation';
import { info, warn } from '../utils/logger';
import { analyzeCode } from './code-analyzer';
import { analyzeDependencies } from './dependency-analyzer';
import { queryOsvVulnerabilities } from './osv-scanner';
import { analyzePackage } from './package-analyzer';
import { checkPublisherReputation } from './publisher-checker';
import { calculateRisk, generateRecommendation } from './risk-scorer';

export async function scanExtension(
  ext: InstalledExtension,
  token?: vscode.CancellationToken,
): Promise<ExtensionSecurityReport> {
  info(`Scanning: ${ext.id}`);
  throwIfCancelled(token);

  const packageResult = analyzePackage(ext);
  throwIfCancelled(token);

  const codeResult = analyzeCode(
    ext.installPath,
    packageResult.detectedCapabilities,
  );
  throwIfCancelled(token);

  const depResult = analyzeDependencies(
    ext.installPath,
    packageResult.extensionDependencies,
  );
  throwIfCancelled(token);

  const pubResult = await checkPublisherReputation(ext, token);
  throwIfCancelled(token);

  const osvEnabled = vscode.workspace
    .getConfiguration('shieldex')
    .get<boolean>('enableOsvScan', true);
  const osvFactors: import('../types').RiskFactor[] = [];
  if (osvEnabled && packageResult.extensionDependencies.length > 0) {
    try {
      const osvResults = await queryOsvVulnerabilities(
        packageResult.extensionDependencies,
        token,
      );
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

export async function scanAllExtensions(
  extensions: InstalledExtension[],
  onProgress?: (current: number, total: number, name: string) => void,
  token?: vscode.CancellationToken,
): Promise<SecuritySummary> {
  const reports: ExtensionSecurityReport[] = [];

  for (let i = 0; i < extensions.length; i++) {
    if (token?.isCancellationRequested) {
      throw new vscode.CancellationError();
    }
    const ext = extensions[i];
    if (onProgress) {
      onProgress(i + 1, extensions.length, ext.displayName || ext.name);
    }
    const report = await scanExtension(ext, token);
    if (token?.isCancellationRequested) {
      throw new vscode.CancellationError();
    }
    reports.push(report);
  }

  reports.sort((a, b) => b.riskScore - a.riskScore);

  const summary: SecuritySummary = {
    totalExtensions: reports.length,
    lowRisk: reports.filter((r) => r.riskLevel === 'low').length,
    moderateRisk: reports.filter((r) => r.riskLevel === 'moderate').length,
    highRisk: reports.filter((r) => r.riskLevel === 'high').length,
    criticalRisk: reports.filter((r) => r.riskLevel === 'critical').length,
    reports,
    scannedAt: new Date().toISOString(),
    vscodeVersion: vscode.version,
  };

  return summary;
}
