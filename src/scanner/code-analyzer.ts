import * as path from 'path';
import { DetectedCapabilities, RiskFactor, TrustSignal } from '../types';
import { SUSPICIOUS_PATTERNS } from '../rules/suspicious-patterns';
import { findFiles, readFileContent } from '../utils/file-utils';

export function analyzeCode(
  extDir: string,
  detectedCapabilities: DetectedCapabilities,
): {
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
} {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  const jsFiles = findFiles(
    extDir,
    ['.js', '.ts', '.mjs', '.cjs'],
    1024 * 1024,
  ); // max 1MB per file

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

  for (const file of jsFiles) {
    const content = readFileContent(file);
    if (!content) continue;

    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (foundPatterns.has(pattern.id)) continue;

      for (const regex of pattern.patterns) {
        if (regex.test(content)) {
          foundPatterns.add(pattern.id);
          if (!evidence.has(pattern.id)) evidence.set(pattern.id, []);
          evidence.get(pattern.id)!.push(path.relative(extDir, file));
          break;
        }
      }
    }
  }

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

      // Update capabilities
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
