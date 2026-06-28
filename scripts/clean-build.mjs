import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'out');
const packageJsonPath = join(root, 'package.json');
const configPath = join(root, 'src', 'config.ts');

const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const configSource = readFileSync(configPath, 'utf8');
const nextConfigSource = configSource.replace(
  /version:\s*'[^']*'/,
  `version: '${version}'`,
);

if (configSource !== nextConfigSource) {
  writeFileSync(configPath, nextConfigSource);
}

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

for (const entry of readdirSync(root)) {
  if (entry.endsWith('.vsix')) {
    rmSync(join(root, entry), { force: true });
  }
}
