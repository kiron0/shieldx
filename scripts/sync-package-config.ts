import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface ExtensionPackageJson {
  name: string;
  version: string;
  description?: string;
  publisher?: string;
  displayName?: string;
  homepage?: string;
  license?: string;
  repository?: {
    url?: string;
  };
  contributes?: {
    viewsContainers?: {
      activitybar?: Array<{
        title?: string;
      }>;
    };
  };
}

function toLiteral(value: Record<string, string | undefined>): string {
  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .map(
      ([key, entryValue]) =>
        `  ${key}: ${JSON.stringify(entryValue).replaceAll('"', "'")},`,
    );

  return `{\n${entries.join('\n')}\n}`;
}

function getSlogan(packageJson: ExtensionPackageJson): string {
  const title =
    packageJson.contributes?.viewsContainers?.activitybar?.[0]?.title;
  const displayName = packageJson.displayName;

  if (
    typeof displayName === 'string' &&
    typeof title === 'string' &&
    displayName.startsWith(`${title} - `)
  ) {
    return displayName.slice(title.length + 3);
  }

  if (typeof displayName === 'string') {
    return displayName;
  }

  return packageJson.name;
}

function buildConfig(
  packageJson: ExtensionPackageJson,
): Record<string, string | undefined> {
  const name =
    packageJson.contributes?.viewsContainers?.activitybar?.[0]?.title ||
    packageJson.displayName ||
    packageJson.name;

  return {
    name,
    version: packageJson.version,
    author: 'Toufiq Hasan Kiron',
    description: packageJson.description,
    slogan: getSlogan(packageJson),
    publisher: packageJson.publisher,
    displayName: packageJson.displayName,
    homepage: packageJson.homepage,
    license: packageJson.license,
    repositoryUrl: packageJson.repository?.url,
  };
}

export function syncPackageConfig(root: string): void {
  const packageJsonPath = join(root, 'package.json');
  const configPath = join(root, 'src', 'config.ts');
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf8'),
  ) as ExtensionPackageJson;
  const config = buildConfig(packageJson);
  const nextSource = `export const EXT_CONFIG = ${toLiteral(config)} as const;\n`;

  mkdirSync(dirname(configPath), { recursive: true });

  const currentSource = (() => {
    try {
      return readFileSync(configPath, 'utf8');
    } catch {
      return '';
    }
  })();

  if (currentSource !== nextSource) {
    writeFileSync(configPath, nextSource);
  }
}
