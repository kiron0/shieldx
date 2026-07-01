import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { findFiles } from '../src/utils/file-utils';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('file-utils', () => {
  it('findFiles matches extensions case-insensitively', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-files-'));
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'one.JS'), 'console.log(1)', 'utf8');
    fs.writeFileSync(path.join(dir, 'two.ts'), 'export {}', 'utf8');
    fs.writeFileSync(path.join(dir, 'skip.txt'), 'x', 'utf8');

    const files = findFiles(dir, ['.js', '.ts']);

    expect(files.map((file) => path.basename(file)).sort()).toEqual([
      'one.JS',
      'two.ts',
    ]);
  });
});
