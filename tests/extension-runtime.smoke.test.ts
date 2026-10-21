import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

type Message = { type: string; [key: string]: unknown };

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createExtensionDir(name: string, publisher: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-runtime-'));
  tempDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name,
      displayName: name,
      publisher,
      version: '1.0.0',
      description: 'runtime smoke test extension',
      license: 'MIT',
      repository: { type: 'git', url: 'https://github.com/test/example' },
      main: './extension.js',
      icon: 'images/icon.png',
      activationEvents: ['onCommand:test.run'],
    }),
    'utf8',
  );
  fs.writeFileSync(
    path.join(dir, 'extension.js'),
    'exports.activate = function () {};\n',
    'utf8',
  );
  fs.mkdirSync(path.join(dir, 'images'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'images', 'icon.png'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  );
  return dir;
}

async function loadExtensionRuntime(options: {
  extensions: Array<{ id: string; extensionPath: string; packageJSON: any }>;
}) {
  vi.resetModules();

  const posted: Message[] = [];
  const registeredCommands = new Map<string, (...args: any[]) => any>();
  let viewProvider:
    | {
        resolveWebviewView: (
          view: unknown,
          context: unknown,
          token: unknown,
        ) => void;
      }
    | undefined;

  const configValues: Record<string, unknown> = {
    autoScanOnStartup: false,
    warnOnHighRisk: false,
    minimumWarningLevel: 'high',
    scanNodeModules: false,
    reportFormat: 'markdown',
    enableOsvScan: false,
    maxHistoryItems: 10,
  };

  const vscodeMock = {
    version: '1.105.0',
    env: {
      appName: 'VS Code',
      clipboard: { writeText: vi.fn(async () => undefined) },
      openExternal: vi.fn(async () => true),
    },
    Uri: {
      file: (p: string) => ({ fsPath: p, toString: () => `file://${p}` }),
      parse: (p: string) => ({ toString: () => p }),
    },
    ProgressLocation: { Notification: 15 },
    ConfigurationTarget: { Global: 1, Workspace: 2 },
    CancellationError: class CancellationError extends Error {},
    CancellationTokenSource: class {
      token = {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => undefined }),
      };
      cancel() {
        this.token.isCancellationRequested = true;
      }
      dispose() {
        /* noop */
      }
    },
    commands: {
      registerCommand: vi.fn((id: string, cb: (...args: any[]) => any) => {
        registeredCommands.set(id, cb);
        return { dispose: () => undefined };
      }),
      executeCommand: vi.fn(async () => undefined),
    },
    window: {
      createOutputChannel: vi.fn(() => ({
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        show: () => undefined,
        dispose: () => undefined,
      })),
      registerWebviewViewProvider: vi.fn((_id: string, provider: unknown) => {
        viewProvider = provider as never;
        return { dispose: () => undefined };
      }),
      showInformationMessage: vi.fn(async () => undefined),
      showWarningMessage: vi.fn(async () => undefined),
      showErrorMessage: vi.fn(async () => undefined),
      withProgress: vi.fn(
        async (
          _options: unknown,
          task: (progress: unknown, token: unknown) => unknown,
        ) =>
          task(
            { report: () => undefined },
            {
              isCancellationRequested: false,
              onCancellationRequested: () => ({ dispose: () => undefined }),
            },
          ),
      ),
    },
    workspace: {
      workspaceFolders: undefined,
      getConfiguration: vi.fn(() => ({
        get: (key: string, fallback?: unknown) =>
          key in configValues ? configValues[key] : fallback,
        inspect: vi.fn(() => undefined),
        update: vi.fn(async () => undefined),
      })),
      onDidChangeConfiguration: vi.fn(() => ({ dispose: () => undefined })),
      onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: () => undefined })),
      fs: {
        readFile: vi.fn(async () => new Uint8Array()),
        writeFile: vi.fn(async () => undefined),
        delete: vi.fn(async () => undefined),
        stat: vi.fn(async () => ({ size: 0 })),
      },
    },
    extensions: {
      all: options.extensions,
      onDidChange: vi.fn(() => ({ dispose: () => undefined })),
    },
  };

  vi.doMock('vscode', () => vscodeMock);

  const extension = await import('../src/extension');

  const globalStore = new Map<string, unknown>();
  const context = {
    subscriptions: [] as Array<{ dispose: () => void }>,
    globalState: {
      get: vi.fn((key: string, fallback?: unknown) =>
        key in globalStore ? globalStore.get(key) : fallback,
      ),
      update: vi.fn(async (key: string, value: unknown) => {
        globalStore.set(key, value);
      }),
    },
    workspaceState: {
      get: vi.fn((_key: string, fallback?: unknown) => fallback),
      update: vi.fn(async () => undefined),
    },
    extensionUri: { fsPath: '/tmp/ext' },
    extensionPath: '/tmp/ext',
    globalStorageUri: { fsPath: path.join(os.tmpdir(), 'shieldx-storage') },
    asAbsolutePath: (p: string) => path.join('/tmp/ext', p),
  } as any;

  extension.activate(context);

  return { extension, context, posted, registeredCommands, viewProvider };
}

describe('extension runtime smoke', () => {
  it('activates, resolves the dashboard view and answers the webview handshake', async () => {
    const dir = createExtensionDir('runtime-ext', 'test-publisher');
    const harness = await loadExtensionRuntime({
      extensions: [
        {
          id: 'test-publisher.runtime-ext',
          extensionPath: dir,
          packageJSON: JSON.parse(
            fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
          ),
        },
      ],
    });

    expect(harness.viewProvider).toBeDefined();

    const received: Message[] = [];
    const webview = {
      options: {},
      html: '',
      cspSource: 'vscode-resource:',
      asWebviewUri: (uri: unknown) => uri,
      postMessage: vi.fn((message: Message) => {
        received.push(message);
        return Promise.resolve(true);
      }),
      onDidReceiveMessage: vi.fn((cb: (message: Message) => void) => {
        harness.posted.push;
        // simulate the webview posting "ready"
        cb({ type: 'ready' });
        return { dispose: () => undefined };
      }),
    };

    const view = { webview, visible: true, onDidDispose: vi.fn() };
    harness.viewProvider?.resolveWebviewView(view, {}, {});

    expect(webview.html).toContain('<title>ShieldX</title>');
    expect(received.map((m) => m.type)).toContain('settingsData');
    expect(received.map((m) => m.type)).toContain('history');
  });

  it('runs a scan and publishes the result to the dashboard', async () => {
    const dir = createExtensionDir('scan-ext', 'test-publisher');
    const harness = await loadExtensionRuntime({
      extensions: [
        {
          id: 'test-publisher.scan-ext',
          extensionPath: dir,
          packageJSON: JSON.parse(
            fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
          ),
        },
      ],
    });

    const received: Message[] = [];
    const webview = {
      options: {},
      html: '',
      cspSource: 'vscode-resource:',
      asWebviewUri: (uri: unknown) => uri,
      postMessage: vi.fn((message: Message) => {
        received.push(message);
        return Promise.resolve(true);
      }),
      onDidReceiveMessage: vi.fn(() => ({ dispose: () => undefined })),
    };
    harness.viewProvider?.resolveWebviewView(
      { webview, visible: true, onDidDispose: vi.fn() },
      {},
      {},
    );

    const scan = harness.registeredCommands.get('shieldx.scanExtensions');
    expect(scan).toBeDefined();
    await scan!();

    const result = received.find((m) => m.type === 'scanResult');
    expect(result).toBeDefined();
    const summary = result?.data as {
      totalExtensions: number;
      reports: Array<{ id: string; riskLevel: string }>;
    };
    expect(summary.totalExtensions).toBe(1);
    expect(summary.reports[0].id).toBe('test-publisher.scan-ext');
  });

  it('serves extension icons to the webview on demand', async () => {
    const dir = createExtensionDir('icon-ext', 'test-publisher');
    const harness = await loadExtensionRuntime({
      extensions: [
        {
          id: 'test-publisher.icon-ext',
          extensionPath: dir,
          packageJSON: JSON.parse(
            fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
          ),
        },
      ],
    });

    const received: Message[] = [];
    let send: ((message: Message) => void) | undefined;
    const webview = {
      options: {},
      html: '',
      cspSource: 'vscode-resource:',
      asWebviewUri: (uri: unknown) => uri,
      postMessage: vi.fn((message: Message) => {
        received.push(message);
        return Promise.resolve(true);
      }),
      onDidReceiveMessage: vi.fn((cb: (message: Message) => void) => {
        send = cb;
        return { dispose: () => undefined };
      }),
    };
    harness.viewProvider?.resolveWebviewView(
      { webview, visible: true, onDidDispose: vi.fn() },
      {},
      {},
    );

    const scan = harness.registeredCommands.get('shieldx.scanExtensions');
    await scan!();

    send?.({ type: 'requestIcons', extensionIds: ['test-publisher.icon-ext'] });

    const icons = received.find((m) => m.type === 'icons');
    expect(icons).toBeDefined();
    const map = icons?.icons as Record<string, string>;
    expect(
      String(map['test-publisher.icon-ext']).startsWith(
        'data:image/png;base64,',
      ),
    ).toBe(true);
  });
});
