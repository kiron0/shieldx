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
const CATEGORY_CACHE = new WeakMap<object, string>();

export function getInstalledExtensions(): InstalledExtension[] {
  return vscode.extensions.all
    .filter((ext) => !ext.id.startsWith('vscode.'))
    .map((ext) => {
      const pkg = ext.packageJSON || {};
      const [publisherFromId = '', nameFromId = ''] = ext.id.split('.');
      const publisher = pkg.publisher || publisherFromId;
      const name = pkg.name || nameFromId;
      return {
        id: ext.id,
        name,
        publisher,
        version: pkg.version || 'unknown',
        displayName: pkg.displayName,
        description: pkg.description,
        marketplaceId: `${publisher}.${name}`,
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
  if (pkg && typeof pkg === 'object') {
    const cached = CATEGORY_CACHE.get(pkg);
    if (cached) return cached;
  }
  const keywordSource: unknown[] = Array.isArray(pkg?.keywords)
    ? pkg.keywords
    : [];
  const categorySource: unknown[] = Array.isArray(pkg?.categories)
    ? pkg.categories
    : [];
  const allWords = [
    ...keywordSource,
    ...categorySource,
    pkg?.displayName,
    pkg?.description,
    pkg?.name,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  for (const [category, patterns] of Object.entries(WELL_KNOWN_CATEGORIES)) {
    for (const pattern of patterns) {
      if (allWords.includes(pattern)) {
        if (pkg && typeof pkg === 'object') CATEGORY_CACHE.set(pkg, category);
        return category;
      }
    }
  }

  if (pkg && typeof pkg === 'object') CATEGORY_CACHE.set(pkg, 'other');
  return 'other';
}

export function getExtensionDependencies(pkg: any): ExtensionDependency[] {
  const deps = new Map<string, ExtensionDependency>();
  const runtimeDeps = [
    ...(Object.entries(pkg?.dependencies || {}) as Array<[string, string]>),
    ...(Object.entries(pkg?.peerDependencies || {}) as Array<[string, string]>),
  ];
  const devDeps = Object.entries(pkg?.devDependencies || {}) as Array<
    [string, string]
  >;

  for (const [name, version] of runtimeDeps) {
    deps.set(name, { name, version, isDev: false });
  }
  for (const [name, version] of devDeps) {
    if (deps.has(name)) continue;
    deps.set(name, { name, version, isDev: true });
  }

  return [...deps.values()];
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
