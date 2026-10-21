import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  isVersionVulnerable,
  parseVersion,
} from '../src/utils/scanner-helpers';

describe('version parsing', () => {
  it('parses plain versions', () => {
    expect(parseVersion('4.17.21')).toEqual({
      major: 4,
      minor: 17,
      patch: 21,
      prerelease: [],
    });
  });

  it('parses ranges by taking the lower bound', () => {
    expect(parseVersion('^4.17.21')).toEqual({
      major: 4,
      minor: 17,
      patch: 21,
      prerelease: [],
    });
    expect(parseVersion('~1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: [],
    });
  });

  it('treats missing components as zero', () => {
    expect(parseVersion('4.17')).toEqual({
      major: 4,
      minor: 17,
      patch: 0,
      prerelease: [],
    });
  });

  it('keeps prerelease identifiers', () => {
    expect(parseVersion('2.0.0-rc.1')?.prerelease).toEqual(['rc', '1']);
  });

  it('returns null for non-version strings', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('1.x')).toBeNull();
  });
});

describe('version comparison', () => {
  it('orders releases before prereleases', () => {
    const release = parseVersion('1.0.0')!;
    const pre = parseVersion('1.0.0-rc.1')!;
    expect(compareVersions(pre, release)).toBeLessThan(0);
    expect(compareVersions(release, pre)).toBeGreaterThan(0);
  });

  it('compares numeric prerelease identifiers numerically', () => {
    const a = parseVersion('1.0.0-rc.2')!;
    const b = parseVersion('1.0.0-rc.10')!;
    expect(compareVersions(a, b)).toBeLessThan(0);
  });
});

describe('isVersionVulnerable', () => {
  it('flags versions below the fixed version', () => {
    expect(isVersionVulnerable('4.17.20', '<4.17.21')).toBe(true);
    expect(isVersionVulnerable('0.18.0', '<0.21.2')).toBe(true);
    expect(isVersionVulnerable('1.0.0', '<4.17.21')).toBe(true);
  });

  it('does not flag the fixed version or newer', () => {
    expect(isVersionVulnerable('4.17.21', '<4.17.21')).toBe(false);
    expect(isVersionVulnerable('5.0.0', '<4.17.21')).toBe(false);
  });

  it('handles range prefixes in the installed version', () => {
    expect(isVersionVulnerable('^4.17.19', '<4.17.21')).toBe(true);
    expect(isVersionVulnerable('~4.17.18', '<4.17.21')).toBe(true);
  });

  it('flags a prerelease of the fixed version', () => {
    expect(isVersionVulnerable('2.0.0-rc.1', '<2.0.0')).toBe(true);
  });

  it('ignores unparsable versions instead of flagging them', () => {
    expect(isVersionVulnerable('latest', '<4.17.21')).toBe(false);
    expect(isVersionVulnerable('', '<4.17.21')).toBe(false);
  });
});
