import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { InstalledExtension } from '../src/utils/extension-utils';
import { EXT_CONFIG } from '../src/config';

vi.mock('vscode', () => ({}));

const tempDirs: string[] = [];
let analyzePackage: typeof import('../src/scanner/package-analyzer').analyzePackage;

function makeExtension(
  packageJSON: any,
  installPath: string,
): InstalledExtension {
  return {
    id: 'test.publisher',
    name: packageJSON.name || 'test-ext',
    publisher: packageJSON.publisher || 'test',
    version: packageJSON.version || '1.0.0',
    displayName: packageJSON.displayName,
    description: packageJSON.description,
    installPath,
    packageJSON,
  };
}

function makeTempExtDir(files: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${EXT_CONFIG.name.toLowerCase()}-pkg-test-`),
  );
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

beforeAll(async () => {
  ({ analyzePackage } = await import('../src/scanner/package-analyzer'));
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Package Analyzer', () => {
  it('does not flag missing license when pkg.licenses array exists', () => {
    const installPath = makeTempExtDir();
    const ext = makeExtension(
      {
        name: 'test-ext',
        publisher: 'test',
        version: '1.0.0',
        licenses: [{ type: 'MIT' }],
      },
      installPath,
    );

    const result = analyzePackage(ext);
    expect(
      result.riskFactors.some((factor) => factor.id === 'no-license'),
    ).toBe(false);
  });

  it('does not flag missing license when LICENSE file exists', () => {
    const installPath = makeTempExtDir({ LICENSE: 'MIT License' });
    const ext = makeExtension(
      {
        name: 'test-ext',
        publisher: 'test',
        version: '1.0.0',
      },
      installPath,
    );

    const result = analyzePackage(ext);
    expect(
      result.riskFactors.some((factor) => factor.id === 'no-license'),
    ).toBe(false);
  });

  it('still flags missing license when metadata and file both absent', () => {
    const installPath = makeTempExtDir();
    const ext = makeExtension(
      {
        name: 'test-ext',
        publisher: 'test',
        version: '1.0.0',
      },
      installPath,
    );

    const result = analyzePackage(ext);
    expect(
      result.riskFactors.some((factor) => factor.id === 'no-license'),
    ).toBe(true);
  });
});
