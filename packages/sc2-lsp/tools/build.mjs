import { context } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const ctx = await context({
    entryPoints: ['src/run.ts'],
    bundle: true,
    format: 'esm',
    minify: production,
    sourcemap: true,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/sc2-lsp.mjs',
    banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
    logLevel: 'info',
});

if (watch) { await ctx.watch(); }
else { await ctx.rebuild(); await ctx.dispose(); }
