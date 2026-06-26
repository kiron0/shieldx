import * as path from 'path';
import { DetectedCapabilities, RiskFactor, TrustSignal } from '../types';
import { findFiles, readFileContent } from '../utils/file-utils';

interface Pattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  patterns: RegExp[];
}

const DANGEROUS_PATTERNS: Pattern[] = [
  {
    id: 'child-process',
    name: 'Shell execution',
    description: 'Uses child_process to execute shell commands.',
    severity: 'high',
    points: 20,
    patterns: [
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /from\s+['"]child_process['"]/,
      /child_process\.exec\s*\(/,
      /child_process\.spawn\s*\(/,
      /child_process\.execSync\s*\(/,
      /child_process\.execFile\s*\(/,
      /\.exec\s*\(\s*['"`][^'"`]*[|;&]/,
    ],
  },
  {
    id: 'network-access',
    name: 'Network requests',
    description: 'Makes external network requests.',
    severity: 'medium',
    points: 15,
    patterns: [
      /require\s*\(\s*['"](?:https?|net|request|axios|got|node-fetch|undici)['"]\s*\)/,
      /from\s+['"](?:https?|net|request|axios|got|node-fetch|undici)['"]/,
      /fetch\s*\(/,
      /axios\s*[.(]/,
      /http\.request\s*\(/,
      /https\.request\s*\(/,
      /net\.connect\s*\(/,
      /net\.createConnection\s*\(/,
    ],
  },
  {
    id: 'env-access',
    name: 'Environment variable access',
    description: 'Reads environment variables.',
    severity: 'medium',
    points: 15,
    patterns: [/process\.env/],
  },
  {
    id: 'filesystem-access',
    name: 'File system access',
    description: 'Reads or writes files on disk.',
    severity: 'low',
    points: 10,
    patterns: [
      /require\s*\(\s*['"]fs['"]\s*\)/,
      /from\s+['"]fs['"]/,
      /fs\.readFile/,
      /fs\.writeFile/,
      /fs\.readdir/,
      /fs\.readFileSync/,
      /fs\.writeFileSync/,
      /workspace\.fs/,
    ],
  },
  {
    id: 'dynamic-exec',
    name: 'Dynamic code execution',
    description: 'Uses eval() or new Function().',
    severity: 'high',
    points: 25,
    patterns: [
      /eval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\(\s*['"`]/,
      /setInterval\s*\(\s*['"`]/,
      /\bFunction\s*\(\s*['"`]return/,
    ],
  },
  {
    id: 'obfuscation',
    name: 'Obfuscation indicators',
    description: 'Contains obfuscated or encoded content.',
    severity: 'high',
    points: 25,
    patterns: [
      /[A-Za-z0-9+/]{500,}={0,2}/, // large base64 strings
      /\\x[0-9a-fA-F]{2}/, // hex escapes
      /_0x[0-9a-fA-F]+/, // hex variable naming
      /atob\s*\(/,
      /btoa\s*\(/,
    ],
  },
  {
    id: 'packed-js',
    name: 'Packed JavaScript',
    description: 'Contains packed/encoded JavaScript patterns.',
    severity: 'high',
    points: 25,
    patterns: [
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)/,
      /}\s*\(\s*'[^']*'\s*\.split\s*\(\s*'[|,]'\s*\)\s*,\s*\d+\s*,\s*\d+\s*,\s*'[^']*'\s*\.split\s*\(\s*'[|,]'\s*\)/,
    ],
  },
  {
    id: 'string-decode',
    name: 'String array decoding',
    description: 'Uses string array decoding to hide strings.',
    severity: 'medium',
    points: 15,
    patterns: [
      /var\s+_\w+\s*=\s*\[[\s\S]*?\];\s*function\s+_\w+\s*\(/,
      /_0x[a-f0-9]{4,6}\s*=\s*function\s*\(/,
    ],
  },
  {
    id: 'suspicious-domains',
    name: 'Suspicious domains',
    description: 'Contains references to suspicious or known bad domains.',
    severity: 'critical',
    points: 30,
    patterns: [
      /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
      /\.onion\b/,
      /requestbin\./,
      /webhook\.site/,
      /canarytokens\./,
      /interact\.sh\b/,
      /burpcollaborator/,
    ],
  },
  {
    id: 'download-exec',
    name: 'Downloads remote executable',
    description: 'Downloads and potentially executes remote files.',
    severity: 'critical',
    points: 40,
    patterns: [
      /\.download\s*\(\s*['"]https?:\/\/[^'"]*\.(?:exe|bin|sh|bat|ps1|dmg|app)['"]/,
      /wget\s+/,
      /curl\s+.*-o\b/,
      /curl\s+.*--output\b/,
    ],
  },
  {
    id: 'encoded-payload',
    name: 'Encoded payload',
    description: 'Contains hex-encoded or XOR-encoded payloads.',
    severity: 'critical',
    points: 30,
    patterns: [
      /['"]\\x[0-9a-fA-F]{50,}['"]/, // long hex-encoded strings
      /String\.fromCharCode\s*\(\s*0x[0-9a-fA-F]{2}/,
    ],
  },
  {
    id: 'api-key-steal',
    name: 'API key theft risk',
    description:
      'Reads credentials/config files and may exfiltrate via network.',
    severity: 'critical',
    points: 35,
    patterns: [
      /fs\.readFile(?:Sync)?\s*\([^)]*\.(?:env|config|secret|credential|key|token|pem)/i,
      /process\.env\b[\s\S]{0,300}?(?:fetch|axios|https?\.request|child_process)/,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*(?:credential|secret|api.?key|token|\.env)/i,
      /atob\s*\(process\.env/,
      /JSON\.parse\s*\(\s*fs\.readFile(?:Sync)?\s*\(/,
    ],
  },
  {
    id: 'code-exfil',
    name: 'Source code exfiltration',
    description: 'Reads source files and sends them over network.',
    severity: 'critical',
    points: 40,
    patterns: [
      /readFile(?:Sync)?\s*\([\s\S]{0,200}?(?:fetch|axios|https?\.request|http\.request)/,
      /readFile(?:Sync)?\s*[\s\S]{0,100}?\.(?:ts|js|tsx|jsx|py|rb|java|go)[\s\S]{0,200}?(?:fetch|axios|https?)/,
      /readdir(?:Sync)?\s*[\s\S]{0,200}?(?:fetch|axios|post)/,
      /glob\s*\([\s\S]{0,200}?(?:fetch|axios|post)/i,
    ],
  },
  {
    id: 'config-exfil',
    name: 'Configuration file reading',
    description: 'Reads sensitive config files like .env, credentials.json.',
    severity: 'high',
    points: 20,
    patterns: [
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*\.env/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*(?:credential|secret|config)\.(?:json|yaml|yml|ini|toml)/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*id_rsa/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*\.pem/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*token/i,
    ],
  },
  {
    id: 'file-mod',
    name: 'File modification without user action',
    description: 'Modifies project files silently during activation.',
    severity: 'high',
    points: 18,
    patterns: [
      /writeFile(?:Sync)?\s*\([^)]*\.[^)]{2,4}\s*,/,
      /writeFile(?:Sync)?\s*\([^)]*(?:src|dist|build|lib|app)/i,
      /appendFile\s*\(/,
      /unlink(?:Sync)?\s*\(/,
    ],
  },
  {
    id: 'suspicious-version-jump',
    name: 'Suspicious version pattern',
    description:
      'Extension version looks suspicious (e.g., major jump, unexpected patch).',
    severity: 'medium',
    points: 12,
    patterns: [/\bv?(?:99|100|999|666)\b/, /version\s*['"`]\d+\.0\.0['"`]/],
  },
];

export function analyzeCode(
  extDir: string,
  detectedCapabilities: DetectedCapabilities,
): {
  riskFactors: RiskFactor[];
  trustSignals: TrustSignal[];
  detectedCapabilities: DetectedCapabilities;
} {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  const jsFiles = findFiles(
    extDir,
    ['.js', '.ts', '.mjs', '.cjs'],
    1024 * 1024,
  ); // max 1MB per file

  if (jsFiles.length === 0) {
    trustSignals.push({
      id: 'no-js-files',
      title: 'No JavaScript files',
      description: 'Extension has no JS/TS source files to scan.',
      points: -5,
    });
    return { riskFactors, trustSignals, detectedCapabilities };
  }

  const foundPatterns = new Set<string>();
  const evidence: Map<string, string[]> = new Map();

  for (const file of jsFiles) {
    const content = readFileContent(file);
    if (!content) continue;

    for (const pattern of DANGEROUS_PATTERNS) {
      if (foundPatterns.has(pattern.id)) continue;

      for (const regex of pattern.patterns) {
        if (regex.test(content)) {
          foundPatterns.add(pattern.id);
          if (!evidence.has(pattern.id)) evidence.set(pattern.id, []);
          evidence.get(pattern.id)!.push(path.relative(extDir, file));
          break;
        }
      }
    }
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (foundPatterns.has(pattern.id)) {
      riskFactors.push({
        id: pattern.id,
        title: pattern.name,
        description: pattern.description,
        severity: pattern.severity,
        points: pattern.points,
        evidence: evidence.get(pattern.id),
      });

      // Update capabilities
      switch (pattern.id) {
        case 'child-process':
          detectedCapabilities.usesChildProcess = true;
          break;
        case 'network-access':
          detectedCapabilities.usesNetworkRequests = true;
          break;
        case 'env-access':
          detectedCapabilities.readsEnvironmentVariables = true;
          break;
        case 'filesystem-access':
          detectedCapabilities.accessesWorkspaceFiles = true;
          break;
        case 'dynamic-exec':
          detectedCapabilities.usesDynamicExecution = true;
          break;
        case 'obfuscation':
        case 'packed-js':
        case 'string-decode':
          detectedCapabilities.hasObfuscatedCode = true;
          break;
        case 'suspicious-domains':
          detectedCapabilities.usesSuspiciousDomains = true;
          break;
        case 'download-exec':
          detectedCapabilities.downloadsRemoteExecutables = true;
          break;
        case 'encoded-payload':
          detectedCapabilities.hasObfuscatedCode = true;
          break;
        case 'api-key-steal':
        case 'code-exfil':
        case 'config-exfil':
          detectedCapabilities.usesNetworkRequests = true;
          detectedCapabilities.accessesWorkspaceFiles = true;
          break;
        case 'file-mod':
          detectedCapabilities.accessesWorkspaceFiles = true;
          break;
      }
    }
  }

  return { riskFactors, trustSignals, detectedCapabilities };
}
