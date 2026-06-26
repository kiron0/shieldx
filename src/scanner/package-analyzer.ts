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
import { readFileContent } from '../utils/file-utils';
import * as path from 'path';

export interface PackageAnalysisResult {
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
  extensionDependencies: ExtensionDependency[];
}

export function analyzePackage(ext: InstalledExtension): PackageAnalysisResult {
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

  // --- Dependencies ---
  const extensionDeps = getExtensionDependencies(pkg);

  // --- Install scripts ---
  const scripts = pkg?.scripts || {};
  const riskyScripts = ['postinstall', 'preinstall', 'install'];
  for (const key of riskyScripts) {
    if (scripts[key]) {
      riskFactors.push({
        id: 'install-script',
        title: 'Has install script',
        description: `Extension runs a "${key}" script during installation.`,
        severity: 'high',
        points: 25,
        evidence: [`scripts.${key}: ${scripts[key]}`],
      });
      capabilities.hasInstallScripts = true;
      break;
    }
  }

  // --- Activation events ---
  const activationEvents: string[] = pkg?.activationEvents || [];
  const broadEvents = ['*', 'onStartupFinished'];
  for (const event of activationEvents) {
    if (broadEvents.includes(event) || event.startsWith('workspaceContains:')) {
      riskFactors.push({
        id: 'broad-activation',
        title: 'Broad activation event',
        description: `Extension activates on "${event}", which gives it broad access.`,
        severity: 'medium',
        points: 10,
        evidence: [`activationEvents includes: "${event}"`],
      });
      capabilities.declaresBroadActivationEvents = true;
      break;
    }
  }

  // --- Risky command names ---
  const commands: any[] = pkg?.contributes?.commands || [];
  const suspiciousNames = [
    'upload',
    'download',
    'execute',
    'shell',
    'remote',
    'token',
    'secret',
    'env',
  ];
  for (const cmd of commands) {
    const cmdTitle = (cmd.title || cmd.command || '').toLowerCase();
    for (const name of suspiciousNames) {
      if (cmdTitle.includes(name)) {
        riskFactors.push({
          id: 'suspicious-command',
          title: 'Suspicious command name',
          description: `Command "${cmd.title || cmd.command}" contains suspicious keyword "${name}".`,
          severity: 'medium',
          points: 14,
          evidence: [cmd.command || cmd.title],
        });
        break;
      }
    }
  }

  // --- Repository check ---
  if (!pkg?.repository) {
    riskFactors.push({
      id: 'no-repo',
      title: 'No repository link',
      description: 'Extension does not link to a source repository.',
      severity: 'low',
      points: 10,
    });
  } else {
    trustSignals.push({
      id: 'has-repo',
      title: 'Public repository',
      description: 'Extension links to a source repository.',
      points: -10,
    });
  }

  // --- License check ---
  if (!pkg?.license) {
    riskFactors.push({
      id: 'no-license',
      title: 'No license',
      description: 'Extension has no license specified.',
      severity: 'low',
      points: 5,
    });
  }

  // --- Publisher checks ---
  const publisher = ext.publisher.toLowerCase();
  if (publisher === 'unknown' || publisher === '') {
    riskFactors.push({
      id: 'unknown-publisher',
      title: 'Unknown publisher',
      description: 'Extension publisher is unknown or missing.',
      severity: 'medium',
      points: 10,
    });
  } else if (isWellKnownPublisher(ext.publisher)) {
    trustSignals.push({
      id: 'known-publisher',
      title: 'Well-known publisher',
      description: `Publisher "${ext.publisher}" is a recognized VS Code extension publisher.`,
      points: -10,
    });
  }

  // --- Well-known category trust signal ---
  if (ext.category && isWellKnownCategory(ext.category)) {
    trustSignals.push({
      id: 'known-category',
      title: 'Well-known extension category',
      description: `Extension belongs to a recognized category: ${ext.category}.`,
      points: -5,
    });
  }

  // --- VS Code capabilities requested ---
  const contributes = pkg?.contributes || {};
  const capabilityKeys = Object.keys(contributes).filter(
    (k) => k !== 'commands',
  );
  if (capabilityKeys.length > 10) {
    riskFactors.push({
      id: 'many-capabilities',
      title: 'Many VS Code capabilities',
      description: `Extension requests ${capabilityKeys.length} different VS Code capability types (${capabilityKeys.slice(0, 5).join(', ')}...).`,
      severity: 'medium',
      points: 12,
      evidence: capabilityKeys,
    });
  }

  // --- Dependencies check ---
  const deps = pkg?.dependencies || {};
  if (Object.keys(deps).length > 20) {
    riskFactors.push({
      id: 'many-deps',
      title: 'Many dependencies',
      description: `Extension has ${Object.keys(deps).length} dependencies, increasing supply chain risk.`,
      severity: 'medium',
      points: 8,
    });
  }

  // --- Main file check ---
  const mainFile = pkg?.main;
  if (mainFile && ext.installPath) {
    const mainPath = path.join(ext.installPath, mainFile);
    checkMainFileSize(mainPath, riskFactors);
  }

  return {
    riskFactors,
    trustSignals,
    detectedCapabilities: capabilities,
    extensionDependencies: extensionDeps,
  };
}

function checkMainFileSize(mainPath: string, riskFactors: RiskFactor[]): void {
  const content = readFileContent(mainPath);
  if (!content) return;

  const lineCount = content.split('\n').length;
  const hasLongLines = content.split('\n').some((line) => line.length > 800);

  if (lineCount === 1 && content.length > 50000) {
    riskFactors.push({
      id: 'single-line-file',
      title: 'Minified single-line file',
      description: 'Main entry is a single minified line, hard to audit.',
      severity: 'high',
      points: 20,
      evidence: [mainPath],
    });
  } else if (hasLongLines && lineCount < 20) {
    riskFactors.push({
      id: 'minified-file',
      title: 'Minified code',
      description: 'Main entry appears minified/bundled.',
      severity: 'medium',
      points: 12,
      evidence: [mainPath],
    });
  }
}
