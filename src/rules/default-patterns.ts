import { ExcludePresetId } from '../types';

export const defaultPatterns = [
  '\\berror\\b',
  '\\bfailed\\b',
  '\\bfailure\\b',
  '\\bfatal\\b',
  '\\bexception\\b',
  '\\bcritical\\b',
  '\\berr(or)?[:!\\]]',
  '\\buncaught\\b',
  'UnhandledPromiseRejection',
  'Traceback \\(most recent call last\\):',
  '\\bsyntaxerror\\b',
  '\\btypeerror\\b',
  '\\breferenceerror\\b',
  '\\brangeerror\\b',
  '\\bmodule\\s+not\\s+found\\b',
  '\\bcannot\\s+find\\s+module\\b',
  '\\bno\\s+module\\s+named\\b',
  '\\bsegmentation\\s+fault\\b',
  '\\bcore\\s+dumped\\b',
  '\\bpanic:|\\bpanicked\\s+at\\b',
  '^\\s*caused\\s+by:',
  '\\bpermission\\s+denied\\b',
  '\\baccess\\s+denied\\b',
  '\\bcommand\\s+not\\s+found\\b',
  '\\btimeout(?:\\s+exceeded)?\\b',
  '\\bconnection\\s+(?:refused|reset|timed\\s*out)\\b',
  '\\bhttp\\s+5\\d\\d\\b',
] as const;

export const defaultExcludePatterns = [
  '^\\[[^\\]]+\\s[0-9a-f]{7,40}\\]\\s(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\\([^)]+\\))?!?:\\s.+$',
  '^(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\\([^)]+\\))?!?:\\s.+$',
] as const;

export const excludePatternPresetDefinitions = [
  {
    id: 'conventionalCommits',
    label: 'Conventional Commits',
    description: 'Ignore commit summary lines that mention error-like words.',
    patterns: [...defaultExcludePatterns],
  },
  {
    id: 'testSnapshots',
    label: 'Test Snapshots',
    description: 'Ignore snapshot/test text that talks about expected errors.',
    patterns: [
      '^\\s*(?:PASS|SNAPSHOT)\\b.*\\berror\\b.*$',
      '^\\s*Expected(?:.*)\\berror\\b.*$',
      '^\\s*Received(?:.*)\\berror\\b.*$',
    ],
  },
  {
    id: 'lintSummaries',
    label: 'Lint Summaries',
    description:
      'Ignore summary banners that report counts without real failure lines.',
    patterns: [
      '^\\s*\\d+\\s+warnings?(?:,\\s*\\d+\\s+errors?)?\\s*$',
      '^\\s*\\d+\\s+errors?,\\s*\\d+\\s+warnings?\\s*$',
      '^\\s*\\u2716\\s+\\d+\\s+problems?\\s*\\(\\s*\\d+\\s+errors?,\\s*\\d+\\s+warnings?\\s*\\)\\s*$',
    ],
  },
  {
    id: 'packageManagerAdvisories',
    label: 'Package Manager Advisories',
    description:
      'Ignore package-manager audit/advisory summaries unless command actually fails.',
    patterns: [
      '^\\s*(?:npm|yarn|pnpm|bun)\\s+(?:audit|advisory)\\b.*$',
      '^\\s*found\\s+\\d+\\s+vulnerabilit(?:y|ies)\\b.*$',
      '^\\s*\\d+\\s+packages?\\s+are\\s+looking\\s+for\\s+funding\\s*$',
    ],
  },
] as const;

const defaultCompiledPatterns = defaultPatterns.map(
  (pattern) => new RegExp(pattern, 'i'),
);

export function compileRegexList(
  rawPatterns: readonly string[],
  kind: 'pattern' | 'exclude',
): RegExp[] {
  return rawPatterns
    .map((pattern) => {
      try {
        return new RegExp(pattern, 'i');
      } catch {
        console.warn(`[faah] Ignoring invalid ${kind} regex: ${pattern}`);
        return null;
      }
    })
    .filter((pattern): pattern is RegExp => pattern !== null);
}

export function getExcludePresetPatterns(
  presetIdsToResolve: readonly string[],
): string[] {
  return presetIdsToResolve.flatMap((presetId) => {
    const presetDefinition = excludePatternPresetDefinitions.find(
      (preset) => preset.id === presetId,
    );
    return presetDefinition ? [...presetDefinition.patterns] : [];
  });
}

/**
 * Compiles the effective detection patterns for a stored settings object.
 * Editor independent so the CLI can use the same defaults.
 */
export function buildRuntimePatterns(stored: {
  patternMode: string;
  excludePresetIds: readonly string[];
  patterns: readonly string[];
  excludePatterns: readonly string[];
}): { patterns: RegExp[]; excludePatterns: RegExp[] } {
  const userPatterns = compileRegexList(stored.patterns, 'pattern');
  const presetExcludePatterns = getExcludePresetPatterns(
    stored.excludePresetIds,
  );
  const excludePatterns = compileRegexList(
    [...presetExcludePatterns, ...stored.excludePatterns],
    'exclude',
  );
  const patterns =
    stored.patternMode === 'append'
      ? [...defaultCompiledPatterns, ...userPatterns]
      : userPatterns.length > 0
        ? userPatterns
        : defaultCompiledPatterns;

  return { patterns, excludePatterns };
}

/**
 * Stable fingerprint of the active detection patterns. Cached scan results are
 * only reused when the fingerprint still matches.
 */
export function fingerprintPatterns(
  patterns: readonly RegExp[],
  excludePatterns: readonly RegExp[],
): string {
  const source = `${patterns.map((r) => r.source).join('\n')}#${excludePatterns
    .map((r) => r.source)
    .join('\n')}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

export type PatternMode = 'override' | 'append';

export type UserPatternConfig = {
  patternMode: PatternMode;
  patterns: readonly string[];
  excludePatterns: readonly string[];
  excludePresetIds: readonly ExcludePresetId[];
};

export type ResolvedUserPatterns = {
  /** Built-in suspicious patterns are disabled in override mode. */
  useBuiltInPatterns: boolean;
  patterns: RegExp[];
  excludePatterns: RegExp[];
};

/**
 * Resolves the user configurable detection patterns.
 *
 * `override` uses only the custom patterns, `append` keeps the built-in
 * suspicious patterns and adds the custom ones. An empty custom list always
 * falls back to the built-in defaults so the scanner never goes blind.
 */
export function resolveUserPatterns(
  config: UserPatternConfig,
): ResolvedUserPatterns {
  const presetExcludePatterns = getExcludePresetPatterns(
    config.excludePresetIds,
  );
  const excludePatterns = compileRegexList(
    [...presetExcludePatterns, ...config.excludePatterns],
    'exclude',
  );

  const customPatterns = compileRegexList(config.patterns, 'pattern');
  const useBuiltInPatterns =
    config.patternMode === 'append' || customPatterns.length === 0;

  return {
    useBuiltInPatterns,
    patterns: customPatterns,
    excludePatterns,
  };
}
