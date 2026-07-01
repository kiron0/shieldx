import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  extensions: {
    all: [],
  },
}));

let detectCategory: typeof import('../src/utils/extension-utils').detectCategory;
let getExtensionDependencies: typeof import('../src/utils/extension-utils').getExtensionDependencies;

beforeAll(async () => {
  ({ detectCategory, getExtensionDependencies } =
    await import('../src/utils/extension-utils'));
});

describe('extension-utils', () => {
  it('dedupes runtime and dev dependencies by name', () => {
    const deps = getExtensionDependencies({
      dependencies: { react: '^18.0.0' },
      peerDependencies: { vscode: '^1.85.0' },
      devDependencies: { react: '^18.2.0', vitest: '^4.0.0' },
    });

    expect(deps).toEqual([
      { name: 'react', version: '^18.0.0', isDev: false },
      { name: 'vscode', version: '^1.85.0', isDev: false },
      { name: 'vitest', version: '^4.0.0', isDev: true },
    ]);
  });

  it('detects category from mixed string fields', () => {
    expect(
      detectCategory({
        keywords: ['Docker'],
        categories: [123, 'Tools'],
        displayName: 'Container Helper',
      }),
    ).toBe('container');
  });
});
