import * as fs from 'fs';
import * as path from 'path';

export function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function readJsonFileAsync<T>(
  filePath: string,
): Promise<T | null> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function writeJsonFileAsync(
  filePath: string,
  data: unknown,
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

export function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function readFileContentAsync(
  filePath: string,
): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export interface FindFilesOptions {
  includeNodeModules?: boolean;
  maxDepth?: number;
}

export function findFiles(
  dir: string,
  extensions: string[],
  maxSizeBytes?: number,
  options: FindFilesOptions = {},
): string[] {
  const results: string[] = [];
  const extensionSet = new Set(extensions.map((ext) => ext.toLowerCase()));
  const maxDepth = options.maxDepth ?? 15;

  function walk(currentDir: string, depth: number = 0): void {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules' && !options.includeNodeModules)
          continue;

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensionSet.has(ext)) {
            if (maxSizeBytes) {
              const stat = fs.statSync(fullPath);
              if (stat.size > maxSizeBytes) continue;
            }
            results.push(fullPath);
          }
        }
      }
    } catch {
      void 0;
    }
  }

  walk(dir);
  return results;
}

export async function findFilesAsync(
  dir: string,
  extensions: string[],
  maxSizeBytes?: number,
  options: FindFilesOptions = {},
): Promise<string[]> {
  const results: string[] = [];
  const extensionSet = new Set(extensions.map((ext) => ext.toLowerCase()));
  const maxDepth = options.maxDepth ?? 15;

  async function walk(currentDir: string, depth: number = 0): Promise<void> {
    if (depth > maxDepth) return;
    try {
      const entries = await fs.promises.readdir(currentDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules' && !options.includeNodeModules)
          continue;

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!extensionSet.has(ext)) continue;
          if (maxSizeBytes) {
            const stat = await fs.promises.stat(fullPath);
            if (stat.size > maxSizeBytes) continue;
          }
          results.push(fullPath);
        }
      }
    } catch {
      void 0;
    }
  }

  await walk(dir);
  return results;
}

/**
 * Reads at most `maxBytes` from the start of a file. Used to inspect large
 * bundles without loading them fully into memory.
 */
export async function readFileHeadAsync(
  filePath: string,
  maxBytes: number,
): Promise<string | null> {
  let handle: fs.promises.FileHandle | undefined;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString('utf-8');
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}
