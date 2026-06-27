import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface PdfBrowserResolution {
  browserPath?: string;
  candidates: string[];
}

export function getPdfBrowserCandidates(
  platform: NodeJS.Platform = process.platform,
  configuredBrowserPath?: string,
): string[] {
  const envCandidates = [
    configuredBrowserPath,
    process.env.SHIELDEX_PDF_BROWSER,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ].filter((value): value is string => !!value);

  if (platform === 'darwin') {
    return [
      ...envCandidates,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ];
  }

  if (platform === 'win32') {
    return [
      ...envCandidates,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    ];
  }

  return [
    ...envCandidates,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
    '/usr/bin/brave-browser',
  ];
}

export function resolvePdfBrowser(
  configuredBrowserPath?: string,
  platform: NodeJS.Platform = process.platform,
  exists: (path: string) => boolean = fs.existsSync,
): PdfBrowserResolution {
  const candidates = getPdfBrowserCandidates(platform, configuredBrowserPath);
  const browserPath = candidates.find((candidate) => exists(candidate));
  return { browserPath, candidates };
}

export function isPdfExportAvailable(
  configuredBrowserPath?: string,
  platform: NodeJS.Platform = process.platform,
  exists: (path: string) => boolean = fs.existsSync,
): boolean {
  return !!resolvePdfBrowser(configuredBrowserPath, platform, exists)
    .browserPath;
}

export function buildPdfBrowserArgs(
  htmlPath: string,
  pdfPath: string,
): string[] {
  return [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    '--print-to-pdf-no-header',
    `--print-to-pdf=${pdfPath}`,
    pathToFileUrl(htmlPath),
  ];
}

export async function renderHtmlToPdf(
  html: string,
  pdfPath: string,
  configuredBrowserPath?: string,
): Promise<void> {
  const { browserPath } = resolvePdfBrowser(configuredBrowserPath);

  if (!browserPath) {
    throw new Error(
      'No supported Chrome/Chromium browser found for exact PDF export. Configure shieldex.pdfBrowserPath or export HTML.',
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldex-pdf-'));
  const htmlPath = path.join(tempDir, 'report.html');

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    const args = buildPdfBrowserArgs(htmlPath, pdfPath);
    await execFileAsync(browserPath, args, { timeout: 30000 });

    if (!fs.existsSync(pdfPath)) {
      throw new Error('Browser did not produce PDF file.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function pathToFileUrl(filePath: string): string {
  const normalized = path.resolve(filePath).split(path.sep).join('/');
  return `file://${encodeURI(normalized.startsWith('/') ? normalized : `/${normalized}`)}`;
}
