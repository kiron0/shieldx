import {
  ExtensionSecurityReport,
  RiskFactor,
  SecuritySummary,
  TrustSignal,
} from '../types';
import { InstalledExtension } from '../utils/extension-utils';
import { CancellableToken, throwIfCancelled } from '../utils/cancellation';
import { info, warn } from '../utils/logger';
import { analyzeCode } from './code-analyzer';
import { analyzeDependencies } from './dependency-analyzer';
import { queryOsvVulnerabilities } from './osv-scanner';
import { analyzePackage, PackageAnalysisResult } from './package-analyzer';
import { checkPublisherReputation } from './publisher-checker';
import { calculateRisk, generateRecommendation } from './risk-scorer';
import { ReportCache } from './report-cache';

export interface ScanCoreOptions {
  osvEnabled?: boolean;
  includeNodeModules?: boolean;
  vscodeVersion?: string;
  concurrency?: number;
  onProgress?: (current: number, total: number, name: string) => void;
  token?: CancellableToken;
  /** Cache of previous scan results, keyed by extension identity. */
  cache?: ReportCache;
  /** User configured detection patterns. */
  patterns?: RegExp[];
  /** User configured suppression patterns. */
  excludePatterns?: RegExp[];
  /** When false the built-in suspicious patterns are not applied. */
  useBuiltInPatterns?: boolean;
  /**
   * Fingerprint of the detection settings. Cached reports are only reused
   * when the fingerprint still matches, so changed patterns invalidate them.
   */
  patternFingerprint?: string;
}

export const DEFAULT_SCAN_CONCURRENCY = 4;

interface LocalAnalysis {
  ext: InstalledExtension;
  packageResult: PackageAnalysisResult;
  codeResult: Awaited<ReturnType<typeof analyzeCode>>;
  depResult: Awaited<ReturnType<typeof analyzeDependencies>>;
  pubResult: Awaited<ReturnType<typeof checkPublisherReputation>>;
  cachedReport?: ExtensionSecurityReport;
}

function buildReport(
  ext: InstalledExtension,
  packageResult: PackageAnalysisResult,
  codeResult: Awaited<ReturnType<typeof analyzeCode>>,
  depResult: Awaited<ReturnType<typeof analyzeDependencies>>,
  pubResult: Awaited<ReturnType<typeof checkPublisherReputation>>,
  osvFactors: RiskFactor[],
): ExtensionSecurityReport {
  const allRiskFactors = [
    ...packageResult.riskFactors,
    ...codeResult.riskFactors,
    ...depResult.riskFactors,
    ...pubResult.riskFactors,
    ...osvFactors,
  ];
  const allTrustSignals: TrustSignal[] = [
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

  return {
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
    patternCollectionFilesSkipped: codeResult.patternCollectionFilesSkipped,
  };
}

function reportRisk(
  ext: InstalledExtension,
  report: ExtensionSecurityReport,
): void {
  if (report.riskLevel === 'high' || report.riskLevel === 'critical') {
    warn(
      `${ext.id} = ${report.riskLevel.toUpperCase()} (score: ${report.riskScore})`,
    );
  }
}

/**
 * Scans a single extension. Editor agnostic: the CLI and the extension share
 * this implementation.
 */
export async function scanExtensionCore(
  ext: InstalledExtension,
  options: ScanCoreOptions = {},
): Promise<ExtensionSecurityReport> {
  throwIfCancelled(options.token);

  const cached = options.cache?.get(options.patternFingerprint ?? '', ext);
  if (cached) {
    info(`Scanning: ${ext.id} (reused cached result)`);
    return cached;
  }

  info(`Scanning: ${ext.id}`);

  const packageResult = await analyzePackage(ext, {
    vscodeVersion: options.vscodeVersion,
  });
  throwIfCancelled(options.token);

  const codeResult = await analyzeCode(
    ext.installPath,
    packageResult.detectedCapabilities,
    {
      includeNodeModules: options.includeNodeModules === true,
      patterns: options.patterns,
      excludePatterns: options.excludePatterns,
      useBuiltInPatterns: options.useBuiltInPatterns,
    },
  );
  throwIfCancelled(options.token);

  const [depResult, pubResult] = await Promise.all([
    analyzeDependencies(ext.installPath, packageResult.extensionDependencies),
    checkPublisherReputation(ext, options.token),
  ]);
  throwIfCancelled(options.token);

  const osvFactors = await queryOsvForDependencies(
    packageResult.extensionDependencies,
    options,
  );

  const report = buildReport(
    ext,
    packageResult,
    codeResult,
    depResult,
    pubResult,
    osvFactors,
  );
  reportRisk(ext, report);

  options.cache?.set(options.patternFingerprint ?? '', ext, report);

  return report;
}

async function queryOsvForDependencies(
  dependencies: Array<{ name: string; version: string; isDev: boolean }>,
  options: ScanCoreOptions,
): Promise<RiskFactor[]> {
  if (options.osvEnabled === false) return [];

  // Only shipped (runtime) dependencies matter: devDependencies are not
  // installed with the extension and would only add noise.
  const runtimeDeps = dependencies.filter((dep) => !dep.isDev);
  if (runtimeDeps.length === 0) return [];

  try {
    return await queryOsvVulnerabilities(runtimeDeps, options.token);
  } catch {
    return [];
  }
}

/**
 * Scans a list of extensions with a bounded worker pool so network lookups
 * overlap without saturating the machine.
 *
 * The scan runs in three phases so the network is hit as few times as
 * possible: local analysis first, then a single OSV batch for every runtime
 * dependency of every extension, then risk aggregation.
 */
export async function scanExtensionsCore(
  extensions: InstalledExtension[],
  options: ScanCoreOptions = {},
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
      vscodeVersion: options.vscodeVersion ?? 'unknown',
    };
  }

  const concurrency = Math.max(
    1,
    Math.min(options.concurrency ?? DEFAULT_SCAN_CONCURRENCY, total),
  );

  const analyses: Array<LocalAnalysis | undefined> = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  // Phase 1: local analysis (manifest, code, dependencies, repository).
  const worker = async (): Promise<void> => {
    for (;;) {
      throwIfCancelled(options.token);
      const index = nextIndex++;
      if (index >= total) return;

      const ext = extensions[index];
      const cached = options.cache?.get(options.patternFingerprint ?? '', ext);
      if (cached) {
        info(`Scanning: ${ext.id} (reused cached result)`);
        analyses[index] = {
          ext,
          packageResult: undefined as never,
          codeResult: undefined as never,
          depResult: undefined as never,
          pubResult: undefined as never,
          cachedReport: cached,
        };
        completed++;
        options.onProgress?.(completed, total, ext.displayName || ext.name);
        continue;
      }

      const packageResult = await analyzePackage(ext, {
        vscodeVersion: options.vscodeVersion,
      });
      const codeResult = await analyzeCode(
        ext.installPath,
        packageResult.detectedCapabilities,
        {
          includeNodeModules: options.includeNodeModules === true,
          patterns: options.patterns,
          excludePatterns: options.excludePatterns,
          useBuiltInPatterns: options.useBuiltInPatterns,
        },
      );
      const [depResult, pubResult] = await Promise.all([
        analyzeDependencies(
          ext.installPath,
          packageResult.extensionDependencies,
        ),
        checkPublisherReputation(ext, options.token),
      ]);

      analyses[index] = {
        ext,
        packageResult,
        codeResult,
        depResult,
        pubResult,
      };

      completed++;
      options.onProgress?.(completed, total, ext.displayName || ext.name);
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  const settled = await Promise.allSettled(workers);

  const failure = settled.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) {
    throw failure.reason;
  }

  // Phase 2: one OSV batch for every runtime dependency of every extension.
  const osvByDependency = new Map<string, RiskFactor[]>();
  if (options.osvEnabled !== false) {
    const runtimeDeps = new Map<string, { name: string; version: string }>();
    for (const analysis of analyses) {
      if (!analysis || analysis.cachedReport) continue;
      for (const dep of analysis.packageResult.extensionDependencies) {
        if (dep.isDev) continue;
        runtimeDeps.set(`${dep.name}@${dep.version}`, {
          name: dep.name,
          version: dep.version,
        });
      }
    }

    if (runtimeDeps.size > 0) {
      try {
        const factors = await queryOsvVulnerabilities(
          [...runtimeDeps.values()],
          options.token,
        );
        for (const factor of factors) {
          const key = (factor.evidence?.[0] ?? '').split(' ')[0];
          const bucket = osvByDependency.get(key) ?? [];
          bucket.push(factor);
          osvByDependency.set(key, bucket);
        }
      } catch {
        void 0;
      }
    }
  }

  // Phase 3: aggregate the risk score per extension.
  for (const analysis of analyses) {
    if (!analysis) continue;

    if (analysis.cachedReport) {
      reports.push(analysis.cachedReport);
      continue;
    }

    const osvFactors: RiskFactor[] = [];
    for (const dep of analysis.packageResult.extensionDependencies) {
      if (dep.isDev) continue;
      const found = osvByDependency.get(`${dep.name}@${dep.version}`);
      if (found) osvFactors.push(...found);
    }

    const report = buildReport(
      analysis.ext,
      analysis.packageResult,
      analysis.codeResult,
      analysis.depResult,
      analysis.pubResult,
      osvFactors,
    );
    reportRisk(analysis.ext, report);
    options.cache?.set(options.patternFingerprint ?? '', analysis.ext, report);
    reports.push(report);
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

  return {
    totalExtensions: reports.length,
    lowRisk,
    moderateRisk,
    highRisk,
    criticalRisk,
    reports,
    scannedAt: new Date().toISOString(),
    vscodeVersion: options.vscodeVersion ?? 'unknown',
  };
}
