import { describe, expect, it } from 'vitest';

function isVersionVulnerable(version: string, range: string): boolean {
  const cleaned = version.replace(/^[\^~>=<]+/, '');
  const rangeCleaned = range.replace(/^[\^~>=<]+/, '');

  const vParts = cleaned.split('.').map(Number);
  const rParts = rangeCleaned.split('.').map(Number);

  for (let i = 0; i < Math.max(vParts.length, rParts.length); i++) {
    const v = vParts[i] || 0;
    const r = rParts[i] || 0;
    if (v < r) return true;
    if (v > r) return false;
  }
  return false;
}

describe('Dependency Version Comparison', () => {
  it('detects vulnerable lodash version', () => {
    expect(isVersionVulnerable('4.17.20', '<4.17.21')).toBe(true);
  });

  it('detects safe lodash version', () => {
    expect(isVersionVulnerable('4.17.21', '<4.17.21')).toBe(false);
  });

  it('detects vulnerable axios', () => {
    expect(isVersionVulnerable('0.18.0', '<0.21.2')).toBe(true);
  });

  it('detects safe axios', () => {
    expect(isVersionVulnerable('0.21.3', '<0.21.2')).toBe(false);
  });

  it('handles caret prefix', () => {
    expect(isVersionVulnerable('^4.17.19', '<4.17.21')).toBe(true);
  });

  it('handles tilde prefix', () => {
    expect(isVersionVulnerable('~4.17.18', '<4.17.21')).toBe(true);
  });

  it('handles semver with missing patch', () => {
    expect(isVersionVulnerable('4.17', '<4.17.21')).toBe(true);
  });

  it('handles equal versions', () => {
    expect(isVersionVulnerable('4.17.21', '<4.17.21')).toBe(false);
  });

  it('detects very old version', () => {
    expect(isVersionVulnerable('1.0.0', '<4.17.21')).toBe(true);
  });

  it('detects newer major version', () => {
    expect(isVersionVulnerable('5.0.0', '<4.17.21')).toBe(false);
  });
});
