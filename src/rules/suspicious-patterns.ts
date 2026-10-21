export interface SuspiciousPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  patterns: RegExp[];
  /**
   * Cheap lower case literals that must be present for the pattern to have any
   * chance of matching. Used to skip the expensive regex scan for files that
   * cannot contain the pattern at all.
   */
  hints?: string[];
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
    severity: 'low',
    points: 6,
    patterns: [
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /from\s+['"]child_process['"]/,
      /child_process\.exec\s*\(/,
      /child_process\.spawn\s*\(/,
      /child_process\.execSync\s*\(/,
      /child_process\.execFile\s*\(/,
      /\.exec\s*\(\s*['"`][^'"`]*[|;&]/,
    ],
    hints: ['child_process', '.exec(', '.spawn(', '.execsync(', '.execfile('],
  },
  {
    id: 'network-access',
    name: 'Network requests',
    description: 'Makes external network requests.',
    severity: 'low',
    points: 3,
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
    hints: [
      'fetch(',
      'axios',
      'http',
      'net.connect',
      'createconnection',
      'request(',
    ],
  },
  {
    id: 'env-access',
    name: 'Environment variable access',
    description: 'Reads environment variables.',
    severity: 'low',
    points: 2,
    patterns: [/process\.env/],
    hints: ['process.env'],
  },
  {
    id: 'filesystem-access',
    name: 'File system access',
    description: 'Reads or writes files on disk.',
    severity: 'low',
    points: 2,
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
    hints: [
      'fs.read',
      'fs.write',
      'fs.readdir',
      'require("fs"',
      "'fs'",
      'workspace.fs',
    ],
  },
  {
    id: 'dynamic-exec',
    name: 'Dynamic code execution',
    description: 'Uses eval() or new Function().',
    severity: 'low',
    points: 6,
    patterns: [
      /(?<![\w$])eval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\(\s*['"`]/,
      /setInterval\s*\(\s*['"`]/,
      /\bFunction\s*\(\s*['"`]return/,
    ],
    hints: ['eval(', 'new function', 'settimeout(', 'setinterval('],
  },
  {
    id: 'obfuscation',
    name: 'Obfuscation indicators',
    description: 'Contains obfuscated or encoded content.',
    severity: 'medium',
    points: 12,
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
    points: 18,
    patterns: [
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)/,
      /}\s*\(\s*'[^']*'\s*\.split\s*\(\s*'[|,]'\s*\)\s*,\s*\d+\s*,\s*\d+\s*,\s*'[^']*'\s*\.split\s*\(\s*'[|,]'\s*\)/,
    ],
    hints: ['split(', 'function('],
  },
  {
    id: 'string-decode',
    name: 'String array decoding',
    description: 'Uses string array decoding to hide strings.',
    severity: 'medium',
    points: 10,
    patterns: [
      /var\s+_\w+\s*=\s*\[[\s\S]*?\];\s*function\s+_\w+\s*\(/,
      /_0x[a-f0-9]{4,6}\s*=\s*function\s*\(/,
    ],
  },
  {
    id: 'suspicious-domains',
    name: 'Suspicious domains',
    description: 'Contains references to known bad or disposable domains.',
    severity: 'critical',
    points: 28,
    patterns: [
      // The negative lookahead keeps the literal pattern sources of security
      // scanners from matching themselves.
      /(?<!\\)\.onion(?![(\w\\])/,
      /(?<!\\)requestbin\.(?![(\w\\])/,
      /(?<!\\)webhook\.site(?![(\w\\])/,
      /(?<!\\)canarytokens\.(?![(\w\\])/,
      /(?<!\\)interact\.sh(?![(\w\\])/,
      /(?<!\\)burpcollaborator(?![(\w\\])/,
    ],
    hints: [
      '.onion',
      'requestbin',
      'webhook.site',
      'canarytokens',
      'interact.sh',
      'burpcollaborator',
    ],
  },
  {
    id: 'public-ip-endpoint',
    name: 'Hardcoded public IP endpoint',
    description: 'Contains a hardcoded public IP address.',
    severity: 'low',
    points: 4,
    patterns: [PUBLIC_IP_URL_PATTERN],
  },
  {
    id: 'download-exec',
    name: 'Downloads remote executable',
    description: 'Downloads and potentially executes remote files.',
    severity: 'critical',
    points: 32,
    patterns: [
      /\.download\s*\(\s*['"]https?:\/\/[^'"]*\.(?:exe|bin|sh|bat|ps1|dmg|app)['"]/,
      /wget\s+/,
      /curl\s+.*-o\b/,
      /curl\s+.*--output\b/,
    ],
    hints: ['wget', 'curl', '.download('],
  },
  {
    id: 'encoded-payload',
    name: 'Encoded payload',
    description: 'Contains hex-encoded or XOR-encoded payloads.',
    severity: 'critical',
    points: 28,
    patterns: [
      /['"]\\x[0-9a-fA-F]{50,}['"]/,
      /String\.fromCharCode\s*\(\s*0x[0-9a-fA-F]{2}/,
    ],
    hints: ['\\\\x', 'fromcharcode'],
  },
  {
    id: 'api-key-steal',
    name: 'API key theft risk',
    description:
      'Reads credentials or secrets and appears to send them over the network.',
    severity: 'critical',
    points: 30,
    patterns: [
      new RegExp(
        `process\\.env\\.${SECRET_ENV_NAME}\\b[\\s\\S]{0,240}?(?:fetch|axios|https?\\.request|child_process)`,
        'i',
      ),
      /atob\s*\(\s*process\.env/,
      new RegExp(
        `readFile(?:Sync)?\\s*\\([^)]*['"\`]([^'"\`]*${SECRET_FILE_NAME})[^'"\`]*['"\`][\\s\\S]{0,300}?(?:fetch|axios|https?\\.request|http\\.request)`,
        'i',
      ),
    ],
    hints: ['readfile', 'process.env', 'fetch', 'axios', 'http', 'atob('],
  },
  {
    id: 'code-exfil',
    name: 'Source code exfiltration',
    description: 'Reads source files and sends them over network.',
    severity: 'critical',
    points: 32,
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
    hints: ['readfile', 'readdir', 'glob', 'fetch', 'axios', 'http', 'post'],
  },
  {
    id: 'config-exfil',
    name: 'Sensitive file access',
    description: 'Reads credential, secret or key files.',
    severity: 'medium',
    points: 10,
    patterns: [
      new RegExp(
        `fs\\.readFile(?:Sync)?\\s*\\(\\s*['"\`][^'"\`]*${SECRET_FILE_NAME}`,
        'i',
      ),
      new RegExp(
        `readFile(?:Sync)?\\s*\\([^)]*['"\`][^'"\`]*${SECRET_FILE_NAME}`,
        'i',
      ),
      new RegExp(
        `JSON\\.parse\\s*\\(\\s*fs\\.readFile(?:Sync)?\\s*\\(\\s*['"\`][^'"\`]*${SECRET_FILE_NAME}`,
        'i',
      ),
    ],
    hints: ['readfile', 'json.parse'],
  },
  {
    id: 'file-mod',
    name: 'File modification without user action',
    description: 'Modifies project files silently during activation.',
    severity: 'low',
    points: 4,
    patterns: [
      /writeFile(?:Sync)?\s*\(\s*['"`][^'"`]*\.(?:ts|tsx|js|jsx|mjs|cjs|json|py|rb|sh|yml|yaml)['"`]/,
      /writeFile(?:Sync)?\s*\(\s*['"`][^'"`]*(?:src|dist|build|lib|app)[/\\][^'"`]*['"`]/i,
      /appendFile(?:Sync)?\s*\(/,
      /unlink(?:Sync)?\s*\(/,
    ],
    hints: ['writefile', 'appendfile', 'unlink'],
  },
  {
    id: 'suspicious-version-jump',
    name: 'Suspicious version pattern',
    description:
      'Extension version looks suspicious (e.g., major jump, unexpected patch).',
    severity: 'low',
    points: 4,
    patterns: [
      /\b(?:version|ver)\s*[:=]\s*['"`]v?(?:99|666|999)\.\d+\.\d+['"`]/i,
      /\b(?:version|ver)\s*[:=]\s*['"`]\d{4,}\.\d+\.\d+['"`]/i,
    ],
    hints: ['version'],
  },
];
