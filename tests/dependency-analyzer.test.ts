import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeDependencies } from '../src/scanner/dependency-analyzer';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-deps-'));
  tempDirs.push(dir);
  return dir;
}

describe('dependency analyzer', () => {
  it('flags vulnerable runtime dependencies', async () => {
    const dir = makeTempDir();

    const result = await analyzeDependencies(dir, [
      { name: 'lodash', version: '4.17.19', isDev: false },
    ]);

    expect(result.riskFactors.some((f) => f.id === 'vuln-lodash')).toBe(true);
  });

  it('ignores vulnerable dev dependencies', async () => {
    const dir = makeTempDir();

    const result = await analyzeDependencies(dir, [
      { name: 'lodash', version: '4.17.19', isDev: true },
    ]);

    expect(result.riskFactors.some((f) => f.id === 'vuln-lodash')).toBe(false);
  });

  it('does not flag safe runtime dependencies', async () => {
    const dir = makeTempDir();

    const result = await analyzeDependencies(dir, [
      { name: 'lodash', version: '4.17.21', isDev: false },
    ]);

    expect(result.riskFactors.some((f) => f.id === 'vuln-lodash')).toBe(false);
  });

  it('reports a lock file as a trust signal', async () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}', 'utf8');

    const result = await analyzeDependencies(dir, []);

    expect(result.trustSignals.some((s) => s.id === 'has-lock-file')).toBe(
      true,
    );
  });

  it('does not report lock files that are absent', async () => {
    const dir = makeTempDir();

    const result = await analyzeDependencies(dir, []);

    expect(result.trustSignals.some((s) => s.id === 'has-lock-file')).toBe(
      false,
    );
    expect(result.trustSignals.some((s) => s.id === 'yarn-lock-parsed')).toBe(
      false,
    );
  });
});
