import * as path from 'path';
import { DetectedCapabilities, RiskFactor, TrustSignal } from '../types';
import { SUSPICIOUS_PATTERNS } from '../rules/suspicious-patterns';
import { findFilesAsync, readFileContentAsync } from '../utils/file-utils';

const FILE_SCAN_CONCURRENCY = 8;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_EVIDENCE_FILES = 3;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;

export interface CodeAnalysisOptions {
  includeNodeModules?: boolean;
}

interface PatternState {
  index: number;
  evidence: string[];
}

export async function analyzeCode(
  extDir: string,
  detectedCapabilities: DetectedCapabilities,
  options: CodeAnalysisOptions = {},
): Promise<{
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
}> {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  const includeNodeModules = options.includeNodeModules === true;

  const jsFiles = await findFilesAsync(
    extDir,
    ['.js', '.ts', '.mjs', '.cjs'],
    MAX_FILE_BYTES,
    { includeNodeModules },
  );

  if (jsFiles.length === 0) {
    trustSignals.push({
      id: 'no-js-files',
      title: 'No JavaScript files',
      description: 'Extension has no JS/TS source files to scan.',
      points: -5,
    });
    return { riskFactors, trustSignals, detectedCapabilities };
  }

  const states: PatternState[] = SUSPICIOUS_PATTERNS.map((_, index) => ({
    index,
    evidence: [],
  }));

  let bytesScanned = 0;
  let saturated = 0;

  async function scanFile(file: string): Promise<void> {
    if (bytesScanned >= MAX_TOTAL_BYTES) return;
    if (saturated >= states.length) return;

    const content = await readFileContentAsync(file);
    if (!content) return;

    bytesScanned += content.length;
    const relativePath = path.relative(extDir, file);

    for (const state of states) {
      if (state.evidence.length >= MAX_EVIDENCE_FILES) continue;
      const pattern = SUSPICIOUS_PATTERNS[state.index];
      for (const regex of pattern.patterns) {
        regex.lastIndex = 0;
        if (regex.test(content)) {
          state.evidence.push(relativePath);
          if (state.evidence.length >= MAX_EVIDENCE_FILES) saturated++;
          break;
        }
      }
    }
  }

  const workerCount = Math.min(FILE_SCAN_CONCURRENCY, jsFiles.length);
  const workers = Array.from(
    { length: workerCount },
    async (_, workerIndex) => {
      for (
        let fileIndex = workerIndex;
        fileIndex < jsFiles.length;
        fileIndex += workerCount
      ) {
        if (bytesScanned >= MAX_TOTAL_BYTES || saturated >= states.length) {
          return;
        }
        await scanFile(jsFiles[fileIndex]);
      }
    },
  );
  await Promise.all(workers);

  for (const state of states) {
    if (state.evidence.length === 0) continue;

    const pattern = SUSPICIOUS_PATTERNS[state.index];
    riskFactors.push({
      id: pattern.id,
      title: pattern.name,
      description: pattern.description,
      severity: pattern.severity,
      points: pattern.points,
      evidence: state.evidence,
    });

    switch (pattern.id) {
      case 'child-process':
        detectedCapabilities.usesChildProcess = true;
        break;
      case 'network-access':
        detectedCapabilities.usesNetworkRequests = true;
        break;
      case 'env-access':
        detectedCapabilities.readsEnvironmentVariables = true;
        break;
      case 'filesystem-access':
        detectedCapabilities.accessesWorkspaceFiles = true;
        break;
      case 'dynamic-exec':
        detectedCapabilities.usesDynamicExecution = true;
        break;
      case 'obfuscation':
      case 'packed-js':
      case 'string-decode':
        detectedCapabilities.hasObfuscatedCode = true;
        break;
      case 'suspicious-domains':
        detectedCapabilities.usesSuspiciousDomains = true;
        break;
      case 'download-exec':
        detectedCapabilities.downloadsRemoteExecutables = true;
        break;
      case 'encoded-payload':
        detectedCapabilities.hasObfuscatedCode = true;
        break;
      case 'api-key-steal':
      case 'code-exfil':
      case 'config-exfil':
        detectedCapabilities.usesNetworkRequests = true;
        detectedCapabilities.accessesWorkspaceFiles = true;
        break;
      case 'file-mod':
        detectedCapabilities.accessesWorkspaceFiles = true;
        break;
    }
  }

  return { riskFactors, trustSignals, detectedCapabilities };
}
