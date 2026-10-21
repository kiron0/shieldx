export interface SuspiciousPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  patterns: RegExp[];
}

const QUOTED_BASE64_PATTERN = /['"`][A-Za-z0-9+/]{200,}={0,2}['"`]/;
const REPEATED_HEX_ESCAPE_PATTERN = /(?:\\x[0-9a-fA-F]{2}){8,}/;
// Loopback, link-local and RFC1918 addresses are normal in extensions
// (dev servers, proxies) and must not be treated as suspicious destinations.
const PUBLIC_IP_URL_PATTERN =
  /https?:\/\/(?!127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)(?:\d{1,3}\.){3}\d{1,3}/;
const SOURCE_FILE_EXTENSION =
  '\\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|py|rb|java|go|php|cs|kt|swift)';
const SECRET_FILE_NAME =
  '(?:\\.env(?:\\.[\\w-]+)?|credentials?|secrets?|api[-_]?keys?|access[-_]?tokens?|id_rsa|\\.pem|\\.key)';
const SECRET_ENV_NAME =
  '[A-Za-z_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|API)[A-Za-z_]*';

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
    severity: 'low',
    points: 6,
    patterns: [
      /require\s*\(\s*['"](?:https?|net|request|axios|got|node-fetch|undici)['"]\s*\)/,
      /from\s+['"](?:https?|net|request|axios|got|node-fetch|undici)['"]/,
      /(?<![\w$.])fetch\s*\(/,
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
    severity: 'low',
    points: 5,
    patterns: [/process\.env/],
  },
  {
    id: 'filesystem-access',
    name: 'File system access',
    description: 'Reads or writes files on disk.',
    severity: 'low',
    points: 4,
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
      /(?<![\w$])eval\s*\(/,
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
      QUOTED_BASE64_PATTERN,
      REPEATED_HEX_ESCAPE_PATTERN,
      /_0x[0-9a-fA-F]+/,
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
      PUBLIC_IP_URL_PATTERN,
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
  {
    id: 'api-key-steal',
    name: 'API key theft risk',
    description:
      'Reads credentials/config files and may exfiltrate via network.',
    severity: 'critical',
    points: 35,
    patterns: [
      new RegExp(
        `fs\\.readFile(?:Sync)?\\s*\\(\\s*['"\`][^'"\`]*${SECRET_FILE_NAME}['"\`]`,
        'i',
      ),
      new RegExp(
        `process\\.env\\.${SECRET_ENV_NAME}\\b[\\s\\S]{0,200}?(?:fetch|axios|https?\\.request|child_process)`,
        'i',
      ),
      new RegExp(
        `readFile(?:Sync)?\\s*\\([^)]*['"\`][^'"\`]*${SECRET_FILE_NAME}`,
        'i',
      ),
      /atob\s*\(process\.env/,
      new RegExp(
        `JSON\\.parse\\s*\\(\\s*fs\\.readFile(?:Sync)?\\s*\\(\\s*['"\`][^'"\`]*${SECRET_FILE_NAME}`,
        'i',
      ),
    ],
  },
  {
    id: 'code-exfil',
    name: 'Source code exfiltration',
    description: 'Reads source files and sends them over network.',
    severity: 'critical',
    points: 40,
    patterns: [
      new RegExp(
        `readFile(?:Sync)?\\s*\\(\\s*['"\`][^'"\`]*${SOURCE_FILE_EXTENSION}['"\`][\\s\\S]{0,240}?(?:fetch|axios|https?\\.request|http\\.request)`,
      ),
      new RegExp(
        `readdir(?:Sync)?\\s*\\(\\s*['"\`][^'"\`]*${SOURCE_FILE_EXTENSION}['"\`][\\s\\S]{0,240}?(?:fetch|axios|post)`,
      ),
      new RegExp(
        `glob\\s*\\(\\s*['"\`][^'"\`]*${SOURCE_FILE_EXTENSION}['"\`][\\s\\S]{0,240}?(?:fetch|axios|post)`,
        'i',
      ),
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
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*(?:credentials?|secrets?)\.(?:json|yaml|yml|ini|toml)/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*id_rsa/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*\.pem/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*access[-_]?token/i,
    ],
  },
  {
    id: 'file-mod',
    name: 'File modification without user action',
    description: 'Modifies project files silently during activation.',
    severity: 'medium',
    points: 8,
    patterns: [
      /writeFile(?:Sync)?\s*\(\s*['"`][^'"`]*\.(?:ts|tsx|js|jsx|mjs|cjs|json|py|rb|sh|yml|yaml)['"`]/,
      /writeFile(?:Sync)?\s*\(\s*['"`][^'"`]*(?:src|dist|build|lib|app)[/\\][^'"`]*['"`]/i,
      /appendFile(?:Sync)?\s*\(/,
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
    patterns: [
      /\b(?:version|ver)\s*[:=]\s*['"`]v?(?:99|666|999)\.\d+\.\d+['"`]/i,
      /\b(?:version|ver)\s*[:=]\s*['"`]\d{4,}\.\d+\.\d+['"`]/i,
    ],
  },
];
