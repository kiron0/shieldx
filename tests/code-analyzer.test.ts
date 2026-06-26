import { describe, it, expect } from 'vitest';
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
