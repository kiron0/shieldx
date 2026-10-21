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
  /** Path of the icon inside the extension folder (relative). */
  iconPath?: string;
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
const ICON_CACHE = new Map<string, string | undefined>();

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

/**
 * Reads an extension icon into a data URL. Results are cached per path so
 * repeated scans do not re-read and re-encode the same file.
 */
export function getExtensionIconDataUrl(
  extensionPath: string,
  pkg: any,
): string | undefined {
  const icon = pkg?.icon;
  if (typeof icon !== 'string' || !icon.trim()) return undefined;

  const fullPath = path.resolve(extensionPath, icon);
  const cacheKey = `${fullPath}`;
  if (ICON_CACHE.has(cacheKey)) {
    return ICON_CACHE.get(cacheKey);
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  const mime = mimeMap[ext];
  if (!mime || !fs.existsSync(fullPath)) {
    ICON_CACHE.set(cacheKey, undefined);
    return undefined;
  }

  try {
    const data = fs.readFileSync(fullPath);
    const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
    ICON_CACHE.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    ICON_CACHE.set(cacheKey, undefined);
    return undefined;
  }
}

export function getExtensionIconPath(pkg: any): string | undefined {
  const icon = pkg?.icon;
  if (typeof icon !== 'string' || !icon.trim()) return undefined;
  return icon;
}

export function buildInstalledExtension(
  id: string,
  installPath: string,
  pkg: any,
): InstalledExtension {
  const [publisherFromId = '', nameFromId = ''] = id.split('.');
  const publisher = pkg?.publisher || publisherFromId;
  const name = pkg?.name || nameFromId;
  return {
    id,
    name,
    publisher,
    version: pkg?.version || 'unknown',
    displayName: pkg?.displayName,
    description: pkg?.description,
    marketplaceId: `${publisher}.${name}`,
    category: detectCategory(pkg),
    installPath,
    iconDataUrl: getExtensionIconDataUrl(installPath, pkg),
    iconPath: getExtensionIconPath(pkg),
    packageJSON: pkg || {},
  };
}
