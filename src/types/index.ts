export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskFactor {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  evidence?: string[];
}

export interface TrustSignal {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface DetectedCapabilities {
  usesChildProcess: boolean;
  usesNetworkRequests: boolean;
  readsEnvironmentVariables: boolean;
  accessesWorkspaceFiles: boolean;
  hasInstallScripts: boolean;
  hasObfuscatedCode: boolean;
  declaresBroadActivationEvents: boolean;
  usesDynamicExecution: boolean;
  downloadsRemoteExecutables: boolean;
  usesSuspiciousDomains: boolean;
}

export interface ExtensionDependency {
  name: string;
  version: string;
  isDev: boolean;
}

export interface ExtensionSecurityReport {
  id: string;
  name: string;
  publisher: string;
  version: string;
  displayName?: string;
  description?: string;
  marketplaceId?: string;
  category?: string;
  installPath: string;
  iconDataUrl?: string;
  /** Path of the icon inside the extension folder (relative). */
  iconPath?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
  extensionDependencies: ExtensionDependency[];
  recommendation: string;
  scannedAt: string;
  /** Files that look like regex collections and were not pattern matched. */
  patternCollectionFilesSkipped?: number;
}

export interface SecuritySummary {
  totalExtensions: number;
  lowRisk: number;
  moderateRisk: number;
  highRisk: number;
  criticalRisk: number;
  reports: ExtensionSecurityReport[];
  scannedAt: string;
  vscodeVersion: string;
}

export interface ScanHistoryEntry {
  id: string;
  time: string;
  total: number;
  high: number;
  critical: number;
  moderate: number;
  low: number;
  summary: SecuritySummary;
}

export interface WarningInfo {
  extension: ExtensionSecurityReport;
  reasons: string[];
}

export interface ShieldXPolicy {
  allowedExtensions?: string[];
  blockedExtensions?: string[];
  maxRiskLevel?: RiskLevel;
}

export interface StoredScan {
  summary: SecuritySummary;
  previousIds: string[];
  version: number;
}

export type ExcludePresetId =
  | 'conventionalCommits'
  | 'testSnapshots'
  | 'lintSummaries'
  | 'packageManagerAdvisories';

export type PatternMode = 'override' | 'append';
export type DiagnosticsSeverityMode = 'error' | 'warningAndError';
export type TerminalDetectionMode = 'either' | 'output' | 'exitCode';

export type StoredSettings = {
  enabled: boolean;
  monitorTerminal: boolean;
  monitorDiagnostics: boolean;
  diagnosticsSeverity: DiagnosticsSeverityMode;
  terminalDetectionMode: TerminalDetectionMode;
  cooldownMs: number;
  terminalCooldownMs: number;
  diagnosticsCooldownMs: number;
  patternMode: PatternMode;
  volumePercent: number;
  showVisualNotifications: boolean;
  customSoundPath: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  excludePresetIds: ExcludePresetId[];
  patterns: string[];
  excludePatterns: string[];
};

export type RuntimeSettings = {
  enabled: boolean;
  monitorTerminal: boolean;
  monitorDiagnostics: boolean;
  diagnosticsSeverity: DiagnosticsSeverityMode;
  terminalDetectionMode: TerminalDetectionMode;
  cooldownMs: number;
  terminalCooldownMs: number;
  diagnosticsCooldownMs: number;
  volumePercent: number;
  showVisualNotifications: boolean;
  customSoundPath: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  excludePresetIds: ExcludePresetId[];
  patterns: RegExp[];
  excludePatterns: RegExp[];
};
