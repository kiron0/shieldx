import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { syncPackageConfig } from './sync-package-config';

const root = process.cwd();
const outDir = join(root, 'out');

syncPackageConfig(root);

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

for (const entry of readdirSync(root)) {
  if (entry.endsWith('.vsix')) {
    rmSync(join(root, entry), { force: true });
  }
}
