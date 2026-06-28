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
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
  extensionDependencies: ExtensionDependency[];
  recommendation: string;
  scannedAt: string;
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
