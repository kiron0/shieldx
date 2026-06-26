import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionDependency } from '../types';

export interface InstalledExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  displayName?: string;
  description?: string;
  marketplaceId?: string;
  category?: string;
  installPath: string;
  iconDataUrl?: string;
  packageJSON: any;
}

const WELL_KNOWN_CATEGORIES: Record<string, string[]> = {
  linter: [
    'eslint',
    'tslint',
    'stylelint',
    'lint',
    'prettier',
    'format',
    'checker',
    'analyzer',
  ],
  formatter: ['prettier', 'format', 'beautify', 'indent'],
  'language-support': [
    'language',
    'syntax',
    'grammar',
    'highlight',
    'snippets',
    'autocomplete',
    'intellisense',
  ],
  theme: [
    'theme',
    'icon',
    'color',
    'material',
    'dracula',
    'monokai',
    'one-dark',
    'night-owl',
  ],
  debugger: ['debug', 'debugger', 'launch', 'attach'],
  'source-control': [
    'git',
    'github',
    'gitlab',
    'bitbucket',
    'merge',
    'diff',
    'commit',
  ],
  testing: ['test', 'jest', 'mocha', 'spec', 'runner', 'coverage'],
  container: ['docker', 'kubernetes', 'container', 'pod'],
  cloud: ['aws', 'azure', 'gcp', 'cloud', 'terraform', 'serverless'],
  database: ['sql', 'mongo', 'redis', 'postgres', 'mysql', 'database', 'query'],
};

const WELL_KNOWN_PUBLISHERS = new Set([
  'ms-',
  'vscode',
  'github',
  'microsoft',
  'redhat',
  'google',
  'amazon',
  'mongodb',
  'dbaeumer',
  'esbenp',
  'eamodio',
  'formulahendry',
  'ms-vscode',
  'ms-vsliveshare',
  'ms-python',
  'ms-toolsai',
  'ms-azuretools',
  'ms-kubernetes-tools',
]);

export function getInstalledExtensions(): InstalledExtension[] {
  return vscode.extensions.all
    .filter((ext) => !ext.id.startsWith('vscode.'))
    .map((ext) => {
      const pkg = ext.packageJSON || {};
      return {
        id: ext.id,
        name: pkg.name || ext.id.split('.').pop() || '',
        publisher: pkg.publisher || ext.id.split('.')[0] || '',
        version: pkg.version || 'unknown',
        displayName: pkg.displayName,
        description: pkg.description,
        marketplaceId: `${pkg.publisher || ext.id.split('.')[0]}.${pkg.name || ext.id.split('.').pop()}`,
        category: detectCategory(pkg),
        installPath: ext.extensionPath,
        iconDataUrl: getExtensionIconDataUrl(ext.extensionPath, pkg),
        packageJSON: pkg,
      };
    });
}

function getExtensionIconDataUrl(
  extensionPath: string,
  pkg: any,
): string | undefined {
  const icon = pkg?.icon;
  if (typeof icon !== 'string' || !icon.trim()) return undefined;

  const fullPath = path.resolve(extensionPath, icon);
  if (!fs.existsSync(fullPath)) return undefined;

  const ext = path.extname(fullPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  const mime = mimeMap[ext];
  if (!mime) return undefined;

  try {
    const data = fs.readFileSync(fullPath);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return undefined;
  }
}

export function getExtensionDir(ext: InstalledExtension): string {
  return ext.installPath;
}

export function detectCategory(pkg: any): string {
  const keywords: string[] = (pkg?.keywords || []).map((k: string) =>
    k.toLowerCase(),
  );
  const categories: string[] = pkg?.categories || [];
  const allWords = [
    ...keywords,
    ...categories.map((c: string) => c.toLowerCase()),
    (pkg?.displayName || '').toLowerCase(),
    (pkg?.description || '').toLowerCase(),
    (pkg?.name || '').toLowerCase(),
  ].join(' ');

  for (const [category, patterns] of Object.entries(WELL_KNOWN_CATEGORIES)) {
    for (const pattern of patterns) {
      if (allWords.includes(pattern)) {
        return category;
      }
    }
  }

  return 'other';
}

export function getExtensionDependencies(pkg: any): ExtensionDependency[] {
  const deps: ExtensionDependency[] = [];
  const allDeps = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.peerDependencies || {}),
  };
  const devDeps = pkg?.devDependencies || {};

  for (const [name, version] of Object.entries(allDeps)) {
    deps.push({ name, version: version as string, isDev: false });
  }
  for (const [name, version] of Object.entries(devDeps)) {
    deps.push({ name, version: version as string, isDev: true });
  }

  return deps;
}

export function isWellKnownPublisher(publisher: string): boolean {
  const lower = publisher.toLowerCase();
  for (const known of WELL_KNOWN_PUBLISHERS) {
    if (
      lower.startsWith(known.toLowerCase()) ||
      lower === known.toLowerCase()
    ) {
      return true;
    }
  }
  return false;
}

export function isWellKnownCategory(category: string): boolean {
  return category !== 'other';
}

export function getVSCodeVersion(): string {
  return vscode.version;
}
