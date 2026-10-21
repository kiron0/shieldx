import { InstalledExtension } from '../utils/extension-utils';
import {
  RiskFactor,
  TrustSignal,
  DetectedCapabilities,
  ExtensionDependency,
} from '../types';
import {
  isWellKnownPublisher,
  isWellKnownCategory,
  getExtensionDependencies,
} from '../utils/extension-utils';
import { readFileContentAsync, readFileHeadAsync } from '../utils/file-utils';
import {
  compareVersions,
  hasLicenseMetadataOrFileAsync,
  isVersionVulnerable,
  parseVersion,
} from '../utils/scanner-helpers';
import * as fs from 'fs';
import * as path from 'path';

const MAX_MAIN_FILE_READ = 256 * 1024;

/**
 * Settings that weaken editor security. An extension that ships a default
 * value for one of these silently changes the user's posture.
 */
const SECURITY_SENSITIVE_SETTINGS = [
  'security.workspace.trust.enabled',
  'security.allowInsecureDownloads',
  'security.promptForRemoteFileProtocol',
  'extensions.autoUpdate',
  'extensions.allowedPublishers',
  'files.autoSave',
  'files.autoSaveDelay',
  'terminal.integrated.enablePersistentSessions',
  'terminal.integrated.confirmOnExit',
  'window.restoreWindows',
  'workbench.trustedDomains',
];

/**
 * Packages with publicly known malicious or compromised releases. The version
 * range uses the same "<fixedVersion" syntax as the known-vulnerable list.
 */
const COMPROMISED_PACKAGES: Array<{
  name: string;
  vulnerableRange: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}> = [
  {
    name: 'event-stream',
    vulnerableRange: '<3.3.6',
    severity: 'critical',
    description:
      'event-stream shipped a malicious flatmap-stream dependency in 2018 that exfiltrated wallet credentials.',
  },
  {
    name: 'ua-parser-js',
    vulnerableRange: '<0.7.32',
    severity: 'critical',
    description:
      'ua-parser-js was compromised in 2021 with a password stealing and cryptocurrency mining payload.',
  },
  {
    name: 'node-ipc',
    vulnerableRange: '<10.1.4',
    severity: 'critical',
    description:
      'node-ipc was compromised in 2022 to overwrite files with a malicious proxy server.',
  },
  {
    name: 'colors',
    vulnerableRange: '<1.4.1',
    severity: 'high',
    description:
      'The colors package was hijacked in 2022 with a destructive infinite loop payload.',
  },
  {
    name: 'loader-utils',
    vulnerableRange: '<4.2.2',
    severity: 'high',
    description:
      'loader-utils shipped a prototype pollution vulnerability that was widely exploited.',
  },
  {
    name: 'nth-check',
    vulnerableRange: '<2.0.1',
    severity: 'high',
    description:
      'nth-check shipped a regular expression denial of service flaw.',
  },
  {
    name: 'ansi-regex',
    vulnerableRange: '<5.0.1',
    severity: 'high',
    description:
      'ansi-regex shipped a regular expression denial of service flaw used for ReDoS attacks.',
  },
  {
    name: 'terser',
    vulnerableRange: '<4.8.1',
    severity: 'medium',
    description: 'terser shipped a regular expression denial of service flaw.',
  },
];

export interface PackageAnalysisOptions {
  vscodeVersion?: string;
}

export interface PackageAnalysisResult {
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
  extensionDependencies: ExtensionDependency[];
}

export async function analyzePackage(
  ext: InstalledExtension,
  options: PackageAnalysisOptions = {},
): Promise<PackageAnalysisResult> {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];
  const pkg = ext.packageJSON;

  const capabilities: DetectedCapabilities = {
    usesChildProcess: false,
    usesNetworkRequests: false,
    readsEnvironmentVariables: false,
    accessesWorkspaceFiles: false,
    hasInstallScripts: false,
    hasObfuscatedCode: false,
    declaresBroadActivationEvents: false,
    usesDynamicExecution: false,
    downloadsRemoteExecutables: false,
    usesSuspiciousDomains: false,
  };

  const extensionDeps = getExtensionDependencies(pkg);

  const scripts = pkg?.scripts || {};
  const riskyScripts = ['postinstall', 'preinstall', 'install'];
  for (const key of riskyScripts) {
    if (scripts[key]) {
      riskFactors.push({
        id: 'install-script',
        title: 'Has install script',
        description: `Extension runs a "${key}" script during installation.`,
        severity: 'medium',
        points: 12,
        evidence: [`scripts.${key}: ${scripts[key]}`],
      });
      capabilities.hasInstallScripts = true;
      break;
    }
  }

  const activationEvents: string[] = pkg?.activationEvents || [];
  const broadEvents = ['*', 'onStartupFinished'];
  for (const event of activationEvents) {
    if (broadEvents.includes(event) || event.startsWith('workspaceContains:')) {
      riskFactors.push({
        id: 'broad-activation',
        title: 'Broad activation event',
        description: `Extension activates on "${event}", which gives it broad access.`,
        severity: event === '*' ? 'medium' : 'low',
        points: event === '*' ? 10 : 4,
        evidence: [`activationEvents includes: "${event}"`],
      });
      capabilities.declaresBroadActivationEvents = true;
      break;
    }
  }

  const commands = pkg?.contributes?.commands || [];
  const suspicious =
    /\b(upload|download|execute|shell|remote|token|secret|env|environment|credential|password)\b/;
  for (const cmd of commands) {
    const title = ((cmd.title || cmd.command || '') as string).toLowerCase();
    const match = title.match(suspicious);
    if (match) {
      riskFactors.push({
        id: 'suspicious-command',
        title: 'Suspicious command name',
        description: `Command "${cmd.title || cmd.command}" contains suspicious keyword "${match[0]}".`,
        severity: 'low',
        points: 5,
        evidence: [cmd.command || cmd.title],
      });
    }
  }

  if (!pkg?.repository) {
    riskFactors.push({
      id: 'no-repo',
      title: 'No repository link',
      description: 'Extension does not link to a source repository.',
      severity: 'low',
      points: 2,
    });
  } else {
    trustSignals.push({
      id: 'has-repo',
      title: 'Public repository',
      description: 'Extension links to a source repository.',
      points: -10,
    });
  }

  if (!(await hasLicenseMetadataOrFileAsync(pkg, ext.installPath))) {
    riskFactors.push({
      id: 'no-license',
      title: 'No license',
      description: 'Extension has no license metadata or LICENSE file.',
      severity: 'low',
      points: 1,
    });
  }

  const publisher = ext.publisher.toLowerCase();
  if (publisher === 'unknown' || publisher === '') {
    riskFactors.push({
      id: 'unknown-publisher',
      title: 'Unknown publisher',
      description: 'Extension publisher is unknown or missing.',
      severity: 'medium',
      points: 8,
    });
  } else if (isWellKnownPublisher(ext.publisher)) {
    trustSignals.push({
      id: 'known-publisher',
      title: 'Well-known publisher',
      description: `Publisher "${ext.publisher}" is a recognized extension publisher.`,
      points: -10,
    });
  }

  if (ext.category && isWellKnownCategory(ext.category)) {
    trustSignals.push({
      id: 'known-category',
      title: 'Well-known extension category',
      description: `Extension belongs to a recognized category: ${ext.category}.`,
      points: -5,
    });
  }

  const contributes = pkg?.contributes || {};
  const capabilityKeys = Object.keys(contributes).filter(
    (k) => k !== 'commands',
  );
  if (capabilityKeys.length > 10) {
    riskFactors.push({
      id: 'many-capabilities',
      title: 'Many extension capabilities',
      description: `Extension requests ${capabilityKeys.length} different editor capability types (${capabilityKeys.slice(0, 5).join(', ')}...).`,
      severity: 'low',
      points: 5,
      evidence: capabilityKeys,
    });
  }

  const deps = pkg?.dependencies || {};
  if (Object.keys(deps).length > 20) {
    riskFactors.push({
      id: 'many-deps',
      title: 'Many dependencies',
      description: `Extension has ${Object.keys(deps).length} dependencies, increasing supply chain risk.`,
      severity: 'low',
      points: 4,
    });
  }

  const mainFile = pkg?.main;
  if (mainFile && ext.installPath) {
    const mainPath = path.join(ext.installPath, mainFile);
    await checkMainFileSize(mainPath, riskFactors);
  }

  analyzeManifestSignals(pkg, options.vscodeVersion, riskFactors, trustSignals);

  return {
    riskFactors,
    trustSignals,
    detectedCapabilities: capabilities,
    extensionDependencies: extensionDeps,
  };
}

async function checkMainFileSize(
  mainPath: string,
  riskFactors: RiskFactor[],
): Promise<void> {
  const stat = await fs.promises.stat(mainPath).catch(() => null);
  if (!stat || !stat.isFile() || stat.size === 0) return;

  // Bundled entry points can be tens of megabytes: only the head of the file
  // is needed to tell minified code from readable source.
  const head =
    stat.size <= MAX_MAIN_FILE_READ
      ? await readFileContentAsync(mainPath)
      : await readFileHeadAsync(mainPath, MAX_MAIN_FILE_READ);
  if (!head) return;

  let lineCount = 1;
  let currentLineLength = 0;
  let maxLineLength = 0;
  let hasLongLines = false;
  for (let i = 0; i < head.length; i++) {
    const ch = head.charCodeAt(i);
    if (ch === 10) {
      lineCount++;
      currentLineLength = 0;
      continue;
    }
    currentLineLength++;
    if (currentLineLength > maxLineLength) maxLineLength = currentLineLength;
    if (currentLineLength > 800) {
      hasLongLines = true;
    }
  }

  if (lineCount === 1 && stat.size > 50000) {
    riskFactors.push({
      id: 'single-line-file',
      title: 'Minified single-line file',
      description: 'Main entry is a single minified line, hard to audit.',
      severity: 'medium',
      points: 10,
      evidence: [mainPath],
    });
  } else if (hasLongLines && lineCount < 20) {
    riskFactors.push({
      id: 'minified-file',
      title: 'Minified code',
      description: 'Main entry appears minified/bundled.',
      severity: 'low',
      points: 5,
      evidence: [mainPath],
    });
  }
}

/**
 * Manifest level signals: editor compatibility, workspace trust, shipped
 * configuration defaults, extension packs and known compromised packages.
 */
function analyzeManifestSignals(
  pkg: any,
  vscodeVersion: string | undefined,
  riskFactors: RiskFactor[],
  trustSignals: TrustSignal[],
): void {
  if (!pkg) return;

  const engine = pkg?.engines?.vscode;
  if (typeof engine === 'string' && vscodeVersion) {
    const required = parseVersion(engine);
    const current = parseVersion(vscodeVersion);
    if (required && current && compareVersions(required, current) > 0) {
      riskFactors.push({
        id: 'outdated-engine',
        title: 'Requires a newer editor version',
        description: `Extension requires VS Code ${engine} but the running editor is ${vscodeVersion}.`,
        severity: 'low',
        points: 4,
        evidence: [`engines.vscode: ${engine}`],
      });
    }
  }

  const workspaceTrust = pkg?.capabilities?.untrustedWorkspaces;
  if (workspaceTrust === true) {
    riskFactors.push({
      id: 'runs-in-untrusted-workspaces',
      title: 'Runs in untrusted workspaces',
      description:
        'Extension declares full support for untrusted workspaces, so it executes in folders that are not trusted.',
      severity: 'medium',
      points: 8,
      evidence: ['capabilities.untrustedWorkspaces: true'],
    });
  } else if (
    workspaceTrust === false ||
    (workspaceTrust && workspaceTrust.supported === 'limited')
  ) {
    trustSignals.push({
      id: 'respects-workspace-trust',
      title: 'Respects workspace trust',
      description:
        'Extension is restricted or disabled in untrusted workspaces.',
      points: -5,
    });
  }

  const shippedSettings = collectShippedSettings(pkg);
  const riskySettings = shippedSettings.filter((key) =>
    SECURITY_SENSITIVE_SETTINGS.includes(key),
  );
  if (riskySettings.length > 0) {
    riskFactors.push({
      id: 'overrides-security-settings',
      title: 'Overrides security sensitive settings',
      description: `Extension ships default values for settings that change the editor security posture: ${riskySettings
        .slice(0, 5)
        .join(', ')}.`,
      severity: 'high',
      points: 18,
      evidence: riskySettings,
    });
  }

  const packedExtensions = [
    ...(Array.isArray(pkg?.extensionPack) ? pkg.extensionPack : []),
    ...(Array.isArray(pkg?.extensionDependencies)
      ? pkg.extensionDependencies
      : []),
  ];
  if (packedExtensions.length > 0) {
    riskFactors.push({
      id: 'installs-other-extensions',
      title: 'Installs additional extensions',
      description: `Extension pulls in ${packedExtensions.length} additional extension(s), widening the attack surface.`,
      severity: 'low',
      points: 4,
      evidence: packedExtensions.slice(0, 10).map(String),
    });
  }

  const commandCount = Array.isArray(pkg?.contributes?.commands)
    ? pkg.contributes.commands.length
    : 0;
  if (commandCount > 50) {
    riskFactors.push({
      id: 'excessive-commands',
      title: 'Registers many commands',
      description: `Extension contributes ${commandCount} commands, which increases the chance of shadowing built-in commands.`,
      severity: 'low',
      points: 4,
      evidence: [`contributes.commands: ${commandCount}`],
    });
  }

  if (pkg?.deprecated) {
    riskFactors.push({
      id: 'deprecated-extension',
      title: 'Extension is deprecated',
      description:
        'The manifest marks this extension as deprecated. It may be unmaintained or replaced by a successor.',
      severity: 'low',
      points: 4,
      evidence: [`deprecated: ${String(pkg.deprecated)}`],
    });
  }

  const runtimeDeps = new Map<string, string>();
  for (const [name, version] of Object.entries(pkg?.dependencies || {})) {
    runtimeDeps.set(name, String(version));
  }
  for (const [name, version] of Object.entries(pkg?.peerDependencies || {})) {
    if (!runtimeDeps.has(name)) runtimeDeps.set(name, String(version));
  }

  for (const compromised of COMPROMISED_PACKAGES) {
    const version = runtimeDeps.get(compromised.name);
    if (!version) continue;
    if (!isVersionVulnerable(version, compromised.vulnerableRange)) continue;
    riskFactors.push({
      id: `compromised-${compromised.name}`,
      title: `Compromised package: ${compromised.name}`,
      description: `${compromised.description} (installed: ${version}, fixed: ${compromised.vulnerableRange})`,
      severity: compromised.severity,
      points: compromised.severity === 'critical' ? 35 : 20,
      evidence: [`${compromised.name}@${version}`],
    });
  }
}

function collectShippedSettings(pkg: any): string[] {
  const keys: string[] = [];
  const configuration = pkg?.contributes?.configuration;
  if (!configuration) return keys;

  const sections = Array.isArray(configuration)
    ? configuration
    : [configuration];
  for (const section of sections) {
    const properties = section?.properties;
    if (!properties || typeof properties !== 'object') continue;
    for (const key of Object.keys(properties)) {
      keys.push(key);
    }
  }
  return keys;
}
