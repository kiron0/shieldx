const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  minify: true,
  target: 'ES2022',
  logLevel: 'info',
};

if (watch) {
  esbuild.context(config).then((ctx) => {
    ctx.watch();
    console.log('Watching...');
  });
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
