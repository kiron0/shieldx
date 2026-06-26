/**
 * Suspicious pattern definitions extracted from code-analyzer.
 * Central registry for all code-level risk detection patterns.
 */

export interface SuspiciousPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  patterns: RegExp[];
}

export const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
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
      /[A-Za-z0-9+/]{500,}={0,2}/,
      /\\x[0-9a-fA-F]{2}/,
      /_0x[0-9a-fA-F]+/,
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
      /['"]\\x[0-9a-fA-F]{50,}['"]/,
      /String\.fromCharCode\s*\(\s*0x[0-9a-fA-F]{2}/,
    ],
  },
];
