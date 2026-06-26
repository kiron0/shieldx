import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'out');

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

for (const entry of readdirSync(root)) {
  if (entry.endsWith('.vsix')) {
    rmSync(join(root, entry), { force: true });
  }
}
