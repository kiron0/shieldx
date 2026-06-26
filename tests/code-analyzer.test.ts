import { describe, it, expect } from 'vitest';
import { RiskFactor, TrustSignal } from '../types';

// Test code-analyzer pattern detection logic in isolation
// We test the regex patterns directly rather than the full scanner (which needs vscode API)

const NETWORK_PATTERNS = [
  /require\s*\(\s*['"](?:https?|net|request|axios|got|node-fetch|undici)['"]\s*\)/,
  /from\s+['"](?:https?|net|request|axios|got|node-fetch|undici)['"]/,
  /fetch\s*\(/,
  /axios\s*[.(]/,
  /http\.request\s*\(/,
  /https\.request\s*\(/,
  /net\.connect\s*\(/,
  /net\.createConnection\s*\(/,
];

const CHILD_PROCESS_PATTERNS = [
  /require\s*\(\s*['"]child_process['"]\s*\)/,
  /from\s+['"]child_process['"]/,
  /child_process\.exec\s*\(/,
  /child_process\.spawn\s*\(/,
  /child_process\.execSync\s*\(/,
  /child_process\.execFile\s*\(/,
];

const DYNAMIC_EXEC_PATTERNS = [
  /eval\s*\(/,
  /new\s+Function\s*\(/,
  /setTimeout\s*\(\s*['"`]/,
  /setInterval\s*\(\s*['"`]/,
  /\bFunction\s*\(\s*['"`]return/,
];

const ENV_ACCESS_PATTERNS = [/process\.env/];

const SUSPICIOUS_DOMAIN_PATTERNS = [
  /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /\.onion\b/,
  /requestbin\./,
  /webhook\.site/,
  /canarytokens\./,
  /interact\.sh\b/,
  /burpcollaborator/,
];

const OBFUSCATION_PATTERNS = [
  /[A-Za-z0-9+/]{500,}={0,2}/,
  /\\x[0-9a-fA-F]{2}/,
  /_0x[0-9a-fA-F]+/,
  /atob\s*\(/,
  /btoa\s*\(/,
];

function matchesAny(content: string, patterns: RegExp[]): boolean {
  for (const p of patterns) {
    if (p.test(content)) return true;
  }
  return false;
}

describe('Code Analyzer Pattern Detection', () => {
  describe('Network patterns', () => {
    it('detects fetch()', () => {
      expect(
        matchesAny(
          'const data = fetch("https://api.example.com")',
          NETWORK_PATTERNS,
        ),
      ).toBe(true);
    });

    it('detects axios', () => {
      expect(
        matchesAny("const axios = require('axios')", NETWORK_PATTERNS),
      ).toBe(true);
    });

    it('detects net.connect', () => {
      expect(matchesAny('net.connect(80, "host")', NETWORK_PATTERNS)).toBe(
        true,
      );
    });

    it('detects http.request', () => {
      expect(
        matchesAny(
          'http.request({ hostname: "example.com" })',
          NETWORK_PATTERNS,
        ),
      ).toBe(true);
    });

    it('does not match innocent code', () => {
      expect(matchesAny('console.log("hello")', NETWORK_PATTERNS)).toBe(false);
    });
  });

  describe('Child process patterns', () => {
    it('detects require child_process', () => {
      expect(
        matchesAny(
          "const cp = require('child_process')",
          CHILD_PROCESS_PATTERNS,
        ),
      ).toBe(true);
    });

    it('detects execSync', () => {
      expect(
        matchesAny('child_process.execSync("ls")', CHILD_PROCESS_PATTERNS),
      ).toBe(true);
    });

    it('detects spawn', () => {
      expect(
        matchesAny(
          'child_process.spawn("node", ["script.js"])',
          CHILD_PROCESS_PATTERNS,
        ),
      ).toBe(true);
    });
  });

  describe('Dynamic execution patterns', () => {
    it('detects eval()', () => {
      expect(matchesAny('eval("alert(1)")', DYNAMIC_EXEC_PATTERNS)).toBe(true);
    });

    it('detects new Function()', () => {
      expect(
        matchesAny('new Function("return 1")()', DYNAMIC_EXEC_PATTERNS),
      ).toBe(true);
    });

    it('detects string setTimeout', () => {
      expect(
        matchesAny('setTimeout("alert(1)", 100)', DYNAMIC_EXEC_PATTERNS),
      ).toBe(true);
    });

    it('does not detect function setTimeout', () => {
      expect(
        matchesAny('setTimeout(() => alert(1), 100)', DYNAMIC_EXEC_PATTERNS),
      ).toBe(false);
    });
  });

  describe('Environment variable patterns', () => {
    it('detects process.env', () => {
      expect(
        matchesAny('const key = process.env.API_KEY', ENV_ACCESS_PATTERNS),
      ).toBe(true);
    });
  });

  describe('Suspicious domain patterns', () => {
    it('detects IP address URLs', () => {
      expect(
        matchesAny('http://192.168.1.1/malware', SUSPICIOUS_DOMAIN_PATTERNS),
      ).toBe(true);
    });

    it('detects .onion domains', () => {
      expect(
        matchesAny('http://abc123.onion/hidden', SUSPICIOUS_DOMAIN_PATTERNS),
      ).toBe(true);
    });

    it('detects webhook.site', () => {
      expect(
        matchesAny('POST https://webhook.site/abc', SUSPICIOUS_DOMAIN_PATTERNS),
      ).toBe(true);
    });

    it('detects burpcollaborator', () => {
      expect(
        matchesAny(
          'data sent to burpcollaborator.net',
          SUSPICIOUS_DOMAIN_PATTERNS,
        ),
      ).toBe(true);
    });
  });

  describe('Obfuscation patterns', () => {
    it('detects large base64 string', () => {
      const longBase64 = 'A'.repeat(600);
      expect(
        matchesAny(`const data = "${longBase64}"`, OBFUSCATION_PATTERNS),
      ).toBe(true);
    });

    it('detects hex escapes', () => {
      expect(
        matchesAny('\\x48\\x65\\x6c\\x6c\\x6f', OBFUSCATION_PATTERNS),
      ).toBe(true);
    });

    it('detects _0x variable naming', () => {
      expect(matchesAny('var _0x1234 = []', OBFUSCATION_PATTERNS)).toBe(true);
    });

    it('detects atob()', () => {
      expect(matchesAny('atob("aGVsbG8=")', OBFUSCATION_PATTERNS)).toBe(true);
    });

    it('does not match short base64', () => {
      expect(matchesAny('const data = "SGVsbG8="', OBFUSCATION_PATTERNS)).toBe(
        false,
      );
    });
  });
});
