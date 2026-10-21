import * as path from 'path';
import { DetectedCapabilities, RiskFactor, TrustSignal } from '../types';
import { SUSPICIOUS_PATTERNS } from '../rules/suspicious-patterns';
import { findFilesAsync, readFileContentAsync } from '../utils/file-utils';

const FILE_SCAN_CONCURRENCY = 8;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_EVIDENCE_FILES = 3;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
// Markers that show up in files which are collections of regular expressions
// (security scanners, validators, parsers). Matching those files flags the
// scanner itself instead of the extension.
const PATTERN_COLLECTION_MARKERS = [
  '(?',
  '\\s',
  '\\d',
  '\\w',
  '[a-z]',
  'RegExp(',
];
const PATTERN_COLLECTION_THRESHOLD = 6;

const LINE_SPLIT_REGEX = /\r?\n/;

function isExcludedLine(
  line: string,
  excludePatterns: readonly RegExp[],
): boolean {
  return excludePatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(line);
  });
}

function matchesCustomPattern(
  line: string,
  patterns: readonly RegExp[],
): boolean {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(line);
  });
}

function looksLikePatternCollection(content: string): boolean {
  let hits = 0;
  for (const marker of PATTERN_COLLECTION_MARKERS) {
    let index = content.indexOf(marker);
    while (index !== -1) {
      hits += 1;
      if (hits >= PATTERN_COLLECTION_THRESHOLD) return true;
      index = content.indexOf(marker, index + marker.length);
    }
  }
  return false;
}

export interface CodeAnalysisOptions {
  includeNodeModules?: boolean;
  /** User configured detection patterns (from shieldx.patterns). */
  patterns?: RegExp[];
  /** User configured suppression patterns (from shieldx.excludePatterns). */
  excludePatterns?: RegExp[];
  /** When false the built-in suspicious patterns are not applied. */
  useBuiltInPatterns?: boolean;
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
  patternCollectionFilesSkipped: number;
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
    return {
      riskFactors,
      trustSignals,
      detectedCapabilities,
      patternCollectionFilesSkipped: 0,
    };
  }

  const states: PatternState[] = SUSPICIOUS_PATTERNS.map((_, index) => ({
    index,
    evidence: [],
  }));
  const useBuiltInPatterns = options.useBuiltInPatterns !== false;
  const userPatterns = options.patterns ?? [];
  const excludePatterns = options.excludePatterns ?? [];
  const customEvidence: string[] = [];

  let bytesScanned = 0;
  let saturated = 0;
  let patternCollectionFilesSkipped = 0;

  async function scanFile(file: string): Promise<void> {
    if (bytesScanned >= MAX_TOTAL_BYTES) return;
    if (saturated >= states.length) return;

    const content = await readFileContentAsync(file);
    if (!content) return;

    bytesScanned += content.length;

    if (looksLikePatternCollection(content)) {
      // The file is a collection of regular expressions, not running code.
      patternCollectionFilesSkipped += 1;
      return;
    }

    const relativePath = path.relative(extDir, file);

    const lowerContent = content.toLowerCase();

    for (const state of states) {
      if (!useBuiltInPatterns) break;
      if (state.evidence.length >= MAX_EVIDENCE_FILES) continue;
      const pattern = SUSPICIOUS_PATTERNS[state.index];
      if (
        pattern.hints &&
        !pattern.hints.some((hint) => lowerContent.includes(hint))
      ) {
        // Cheap literal check failed: the pattern cannot match this file.
        continue;
      }
      for (const regex of pattern.patterns) {
        regex.lastIndex = 0;
        if (regex.test(content)) {
          state.evidence.push(relativePath);
          if (state.evidence.length >= MAX_EVIDENCE_FILES) saturated++;
          break;
        }
      }
    }

    if (userPatterns.length > 0 && customEvidence.length < MAX_EVIDENCE_FILES) {
      const lines = content.split(LINE_SPLIT_REGEX);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (isExcludedLine(trimmed, excludePatterns)) continue;
        if (matchesCustomPattern(trimmed, userPatterns)) {
          customEvidence.push(`${relativePath}: ${trimmed.slice(0, 120)}`);
          if (customEvidence.length >= MAX_EVIDENCE_FILES) break;
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
      case 'public-ip-endpoint':
        detectedCapabilities.usesNetworkRequests = true;
        break;
      case 'download-exec':
        detectedCapabilities.downloadsRemoteExecutables = true;
        break;
      case 'encoded-payload':
        detectedCapabilities.hasObfuscatedCode = true;
        break;
      case 'api-key-steal':
      case 'code-exfil':
        detectedCapabilities.usesNetworkRequests = true;
        detectedCapabilities.accessesWorkspaceFiles = true;
        break;
      case 'config-exfil':
        detectedCapabilities.accessesWorkspaceFiles = true;
        break;
      case 'file-mod':
        detectedCapabilities.accessesWorkspaceFiles = true;
        break;
    }
  }

  if (customEvidence.length > 0) {
    riskFactors.push({
      id: 'custom-pattern',
      title: 'Custom error pattern matched',
      description:
        'Lines matching the configured custom detection patterns were found in the extension code.',
      // Low severity on purpose: custom patterns are a weak signal on their
      // own and must not escalate an extension on their own.
      severity: 'low',
      points: Math.min(3 + customEvidence.length, 12),
      evidence: customEvidence,
    });
  }

  return {
    riskFactors,
    trustSignals,
    detectedCapabilities,
    patternCollectionFilesSkipped,
  };
}
