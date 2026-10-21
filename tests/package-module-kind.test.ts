import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type PackageJson = {
  name: string;
  main: string;
  type?: string;
};

type TsconfigJson = {
  compilerOptions: { module?: string; moduleResolution?: string };
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8'),
  ) as T;
}

const esmModuleKinds = new Set([
  'es2015',
  'es2020',
  'es2022',
  'esnext',
  'node16',
  'node18',
  'node20',
  'nodenext',
  'preserve',
]);

describe('extension package module kind', () => {
  it('matches the module kind the compiler emits', () => {
    const packageJson = readJson<PackageJson>('package.json');
    const tsconfig = readJson<TsconfigJson>('tsconfig.json');

    const compilerModule = tsconfig.compilerOptions.module ?? 'commonjs';
    const emitsEsm = esmModuleKinds.has(compilerModule);

    if (emitsEsm) {
      expect(packageJson.type).toBe('module');
    } else {
      // CommonJS output in a "type": "module" package fails at load time with
      // "exports is not defined in ES module scope" and the extension never
      // activates.
      expect(packageJson.type).not.toBe('module');
    }
  });

  it('points main at the compiled entry point', () => {
    const packageJson = readJson<PackageJson>('package.json');
    expect(packageJson.main).toBe('./out/extension.js');
    expect(fs.existsSync(path.resolve(process.cwd(), 'src/extension.ts'))).toBe(
      true,
    );
  });
});
