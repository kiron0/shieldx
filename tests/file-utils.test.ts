import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  findFiles,
  findFilesAsync,
  readFileHeadAsync,
} from '../src/utils/file-utils';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-files-'));
  tempDirs.push(dir);
  return dir;
}

describe('file-utils', () => {
  it('findFiles matches extensions case-insensitively', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'one.JS'), 'console.log(1)', 'utf8');
    fs.writeFileSync(path.join(dir, 'two.ts'), 'export {}', 'utf8');
    fs.writeFileSync(path.join(dir, 'skip.txt'), 'x', 'utf8');

    const files = findFiles(dir, ['.js', '.ts']);

    expect(files.map((file) => path.basename(file)).sort()).toEqual([
      'one.JS',
      'two.ts',
    ]);
  });

  it('skips node_modules by default', async () => {
    const dir = makeTempDir();
    const nested = path.join(dir, 'node_modules', 'pkg');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'dep.js'), 'module.exports = 1', 'utf8');

    const files = await findFilesAsync(dir, ['.js']);

    expect(files).toHaveLength(0);
  });

  it('includes node_modules when explicitly requested', async () => {
    const dir = makeTempDir();
    const nested = path.join(dir, 'node_modules', 'pkg');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'dep.js'), 'module.exports = 1', 'utf8');

    const files = await findFilesAsync(dir, ['.js'], undefined, {
      includeNodeModules: true,
    });

    expect(files.map((file) => path.basename(file))).toEqual(['dep.js']);
  });

  it('reads only the requested head of a file', async () => {
    const dir = makeTempDir();
    const file = path.join(dir, 'big.js');
    fs.writeFileSync(file, 'a'.repeat(1000), 'utf8');

    const head = await readFileHeadAsync(file, 100);

    expect(head?.length).toBe(100);
  });

  it('returns null for a missing file head', async () => {
    const head = await readFileHeadAsync(
      path.join(os.tmpdir(), 'shieldx-does-not-exist.js'),
      10,
    );
    expect(head).toBeNull();
  });
});
