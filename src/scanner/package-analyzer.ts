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
import { readFileContentAsync } from '../utils/file-utils';
import { hasLicenseMetadataOrFileAsync } from '../utils/scanner-helpers';
import * as path from 'path';

export interface PackageAnalysisResult {
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
  extensionDependencies: ExtensionDependency[];
}

export async function analyzePackage(
  ext: InstalledExtension,
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
        severity: 'high',
        points: 25,
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
        severity: 'medium',
        points: 10,
        evidence: [`activationEvents includes: "${event}"`],
      });
      capabilities.declaresBroadActivationEvents = true;
      break;
    }
  }

  const commands = pkg?.contributes?.commands || [];
  const suspicious = /upload|download|execute|shell|remote|token|secret|env/;
  for (const cmd of commands) {
    const title = ((cmd.title || cmd.command || '') as string).toLowerCase();
    const match = title.match(suspicious);
    if (match) {
      riskFactors.push({
        id: 'suspicious-command',
        title: 'Suspicious command name',
        description: `Command "${cmd.title || cmd.command}" contains suspicious keyword "${match[0]}".`,
        severity: 'medium',
        points: 14,
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

  if (!(await hasLicenseMetadataOrFileAsync(pkg, ext.installPath))) {
    riskFactors.push({
      id: 'no-license',
      title: 'No license',
      description: 'Extension has no license metadata or LICENSE file.',
      severity: 'low',
      points: 5,
    });
  }

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
      severity: 'medium',
      points: 12,
      evidence: capabilityKeys,
    });
  }

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

  const mainFile = pkg?.main;
  if (mainFile && ext.installPath) {
    const mainPath = path.join(ext.installPath, mainFile);
    await checkMainFileSize(mainPath, riskFactors);
  }

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
  const content = await readFileContentAsync(mainPath);
  if (!content) return;

  let lineCount = 1;
  let currentLineLength = 0;
  let hasLongLines = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    if (ch === 10) {
      lineCount++;
      currentLineLength = 0;
      continue;
    }
    currentLineLength++;
    if (currentLineLength > 800) {
      hasLongLines = true;
    }
  }

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
