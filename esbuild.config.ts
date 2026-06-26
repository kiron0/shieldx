import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const config: esbuild.BuildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  minify: true,
  target: 'es2022',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching...');
} else {
  await esbuild.build(config);
}
