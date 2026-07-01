import * as path from 'path';
import { DetectedCapabilities, RiskFactor, TrustSignal } from '../types';
import { SUSPICIOUS_PATTERNS } from '../rules/suspicious-patterns';
import { findFilesAsync, readFileContentAsync } from '../utils/file-utils';

const FILE_SCAN_CONCURRENCY = 8;

export async function analyzeCode(
  extDir: string,
  detectedCapabilities: DetectedCapabilities,
): Promise<{
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
}> {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  const jsFiles = await findFilesAsync(
    extDir,
    ['.js', '.ts', '.mjs', '.cjs'],
    1024 * 1024,
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

  const foundPatterns = new Set<string>();
  const evidence: Map<string, string[]> = new Map();

  async function scanFile(file: string): Promise<void> {
    const content = await readFileContentAsync(file);
    if (!content) return;

    for (const pattern of SUSPICIOUS_PATTERNS) {
      for (const regex of pattern.patterns) {
        regex.lastIndex = 0;
        if (regex.test(content)) {
          foundPatterns.add(pattern.id);
          const matches = evidence.get(pattern.id) ?? [];
          const relativePath = path.relative(extDir, file);
          if (!matches.includes(relativePath)) {
            matches.push(relativePath);
            evidence.set(pattern.id, matches);
          }
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
        await scanFile(jsFiles[fileIndex]);
      }
    },
  );
  await Promise.all(workers);

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (foundPatterns.has(pattern.id)) {
      riskFactors.push({
        id: pattern.id,
        title: pattern.name,
        description: pattern.description,
        severity: pattern.severity,
        points: pattern.points,
        evidence: evidence.get(pattern.id),
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
  }

  return { riskFactors, trustSignals, detectedCapabilities };
}
