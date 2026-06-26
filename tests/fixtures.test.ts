import { describe, it, expect } from 'vitest';
import {
  maliciousExtensionPkg,
  benignExtensionPkg,
  maliciousExtensionCode,
  benignExtensionCode,
} from './fixtures';

describe('Malicious Extension Fixture', () => {
  it('has postinstall script', () => {
    expect(maliciousExtensionPkg.scripts.postinstall).toBeTruthy();
    expect(maliciousExtensionPkg.scripts.postinstall).toContain('curl');
  });

  it('has suspicious commands', () => {
    const cmds = maliciousExtensionPkg.contributes.commands;
    expect(cmds.some((c: any) => c.command.includes('upload'))).toBe(true);
    expect(cmds.some((c: any) => c.command.includes('execute'))).toBe(true);
  });

  it('has broad activation events', () => {
    expect(maliciousExtensionPkg.activationEvents).toContain(
      'onStartupFinished',
    );
    expect(maliciousExtensionPkg.activationEvents).toContain(
      'workspaceContains:.env',
    );
  });

  it('has known vulnerable dependencies', () => {
    expect(maliciousExtensionPkg.dependencies.axios).toBe('0.18.0');
    expect(maliciousExtensionPkg.dependencies.lodash).toBe('4.17.19');
  });
});

describe('Benign Extension Fixture', () => {
  it('has well-known publisher', () => {
    expect(benignExtensionPkg.publisher).toBe('vscode');
  });

  it('has safe commands only', () => {
    const cmds = benignExtensionPkg.contributes.commands;
    expect(
      cmds.every(
        (c: any) =>
          !c.command.includes('upload') && !c.command.includes('execute'),
      ),
    ).toBe(true);
  });

  it('has specific activation event', () => {
    expect(benignExtensionPkg.activationEvents).toEqual([
      'onCommand:test.safeCommand',
    ]);
  });

  it('has non-vulnerable dependencies', () => {
    expect(benignExtensionPkg.dependencies.lodash).toBe('4.17.21');
    expect(benignExtensionPkg.dependencies.semver).toBe('7.6.0');
  });
});

describe('Malicious Code Fixture', () => {
  it('contains child_process usage', () => {
    expect(maliciousExtensionCode).toContain("require('child_process')");
    expect(maliciousExtensionCode).toContain('cp.exec(');
    expect(maliciousExtensionCode).toContain('cp.execSync(');
  });

  it('contains network exfiltration', () => {
    expect(maliciousExtensionCode).toContain('readFileSync');
    expect(maliciousExtensionCode).toContain('https.request');
    expect(maliciousExtensionCode).toContain('192.168.1.1');
  });

  it('contains obfuscation', () => {
    expect(maliciousExtensionCode).toContain('atob(');
    expect(maliciousExtensionCode).toContain('eval(atob(');
  });

  it('contains .env reading', () => {
    expect(maliciousExtensionCode).toContain(".readFileSync('.env'");
  });

  it('contains download exec', () => {
    expect(maliciousExtensionCode).toContain('wget');
    expect(maliciousExtensionCode).toContain('.exe');
  });
});

describe('Benign Code Fixture', () => {
  it('only uses VS Code API', () => {
    expect(benignExtensionCode).toContain("require('vscode')");
  });

  it('has no dangerous patterns', () => {
    expect(benignExtensionCode).not.toContain('child_process');
    expect(benignExtensionCode).not.toContain('fetch');
    expect(benignExtensionCode).not.toContain('eval');
    expect(benignExtensionCode).not.toContain('atob');
    expect(benignExtensionCode).not.toContain('process.env');
  });
});

describe('Manual Test Helper', () => {
  it('malicious fixture has all pattern triggers', () => {
    const patterns = [
      'child_process',
      'postinstall',
      '.env',
      'eval',
      'atob',
      'wget',
      '192.168',
      'upload',
      'execute',
    ];
    for (const p of patterns) {
      const inPkg = JSON.stringify(maliciousExtensionPkg)
        .toLowerCase()
        .includes(p);
      const inCode = maliciousExtensionCode.toLowerCase().includes(p);
      expect(inPkg || inCode).toBe(true);
    }
  });
});
