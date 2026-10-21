import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  clearIconCache,
  resolveIconDataUrl,
  withResolvedIcons,
} from '../src/utils/icon-resolver';

const tempDirs: string[] = [];

afterEach(() => {
  clearIconCache();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeExtensionWithIcon(): { dir: string; iconPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-icon-'));
  tempDirs.push(dir);
  const iconPath = 'images/icon.png';
  fs.mkdirSync(path.join(dir, 'images'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, iconPath),
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  );
  return { dir, iconPath };
}

describe('icon resolver', () => {
  it('reads the icon from disk when the report only has the path', () => {
    const { dir, iconPath } = makeExtensionWithIcon();

    const dataUrl = resolveIconDataUrl({
      id: 'pub.ext',
      iconPath,
      installPath: dir,
    });

    expect(dataUrl).toBeDefined();
    expect(dataUrl?.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('prefers the inline payload', () => {
    const dataUrl = resolveIconDataUrl({
      id: 'pub.ext',
      iconDataUrl: 'data:image/png;base64,INLINE',
      iconPath: 'missing.png',
      installPath: '/nowhere',
    });

    expect(dataUrl).toBe('data:image/png;base64,INLINE');
  });

  it('returns undefined for a missing icon', () => {
    expect(
      resolveIconDataUrl({
        id: 'pub.ext',
        iconPath: 'missing.png',
        installPath: '/nowhere',
      }),
    ).toBeUndefined();
  });

  it('attaches the icon to a report for exports', () => {
    const { dir, iconPath } = makeExtensionWithIcon();

    const report = withResolvedIcons({
      id: 'pub.ext',
      iconPath,
      installPath: dir,
    } as never);

    expect(report.iconDataUrl).toBeDefined();
  });

  it('leaves a report with an inline icon untouched', () => {
    const report = { id: 'pub.ext', iconDataUrl: 'data:image/png;base64,X' };
    expect(withResolvedIcons(report as never)).toBe(report);
  });

  it('falls back to the manifest when the report has no icon path', () => {
    const { dir } = makeExtensionWithIcon();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'ext',
        publisher: 'pub',
        icon: 'images/icon.png',
      }),
      'utf8',
    );

    const dataUrl = resolveIconDataUrl({
      id: 'pub.ext',
      installPath: dir,
    });

    expect(dataUrl?.startsWith('data:image/png;base64,')).toBe(true);
  });
});
