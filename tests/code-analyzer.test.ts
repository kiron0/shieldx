import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { analyzeCode } from '../src/scanner/code-analyzer';
import { SUSPICIOUS_PATTERNS } from '../src/rules/suspicious-patterns';

function getPatterns(id: string): RegExp[] {
  const pattern = SUSPICIOUS_PATTERNS.find((entry) => entry.id === id);
  if (!pattern) throw new Error(`Missing pattern: ${id}`);
  return pattern.patterns;
}

function matchesAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

describe('Code Analyzer Pattern Detection', () => {
  it('keeps evidence from multiple files for same finding', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-code-'));
    fs.writeFileSync(
      path.join(dir, 'one.js'),
      'fetch("https://api.example.com/one")',
      'utf8',
    );
    fs.writeFileSync(
      path.join(dir, 'two.js'),
      'fetch("https://api.example.com/two")',
      'utf8',
    );

    const result = await analyzeCode(dir, {
      usesChildProcess: false,
      usesNetworkRequests: false,
      readsEnvironmentVariables: false,
      accessesWorkspaceFiles: false,
      hasInstallScripts: false,
      hasObfuscatedCode: false,
      declaresBroadActivationEvents: false,
      usesDynamicExecution: false,
      downloadsRemoteExecutables: false,
      usesSuspiciousDomains: false,
    });

    expect(
      result.riskFactors
        .find((entry) => entry.id === 'network-access')
        ?.evidence?.slice()
        .sort(),
    ).toEqual(['one.js', 'two.js']);
  });

  describe('Network patterns', () => {
    const patterns = getPatterns('network-access');

    it('detects fetch()', () => {
      expect(
        matchesAny('const data = fetch("https://api.example.com")', patterns),
      ).toBe(true);
    });

    it('does not match innocent code', () => {
      expect(matchesAny('console.log("hello")', patterns)).toBe(false);
    });
  });

  describe('Child process patterns', () => {
    const patterns = getPatterns('child-process');

    it('detects execSync', () => {
      expect(matchesAny('child_process.execSync("ls")', patterns)).toBe(true);
    });
  });

  describe('Dynamic execution patterns', () => {
    const patterns = getPatterns('dynamic-exec');

    it('detects eval()', () => {
      expect(matchesAny('eval("alert(1)")', patterns)).toBe(true);
    });

    it('does not detect function setTimeout', () => {
      expect(matchesAny('setTimeout(() => alert(1), 100)', patterns)).toBe(
        false,
      );
    });
  });

  describe('Obfuscation patterns', () => {
    const patterns = getPatterns('obfuscation');

    it('detects large quoted base64 string', () => {
      const longBase64 = 'AbC123+/'.repeat(30);
      expect(matchesAny(`const data = "${longBase64}"`, patterns)).toBe(true);
    });

    it('detects repeated hex escapes', () => {
      expect(
        matchesAny(
          '\\x48\\x65\\x6c\\x6c\\x6f\\x20\\x77\\x6f\\x72\\x6c\\x64',
          patterns,
        ),
      ).toBe(true);
    });

    it('does not flag single hex escape', () => {
      expect(matchesAny('const newline = "\\x0a";', patterns)).toBe(false);
    });

    it('does not flag atob usage by itself', () => {
      expect(matchesAny('const data = atob(encoded);', patterns)).toBe(false);
    });

    it('does not flag btoa usage by itself', () => {
      expect(matchesAny('const data = btoa(raw);', patterns)).toBe(false);
    });
  });

  describe('Suspicious version patterns', () => {
    const patterns = getPatterns('suspicious-version-jump');

    it('detects exaggerated version markers', () => {
      expect(matchesAny('const version = "999.0.0";', patterns)).toBe(true);
    });

    it('does not flag common 100.x versions', () => {
      expect(matchesAny('const version = "100.0.0";', patterns)).toBe(false);
    });
  });
});
