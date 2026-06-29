import { context } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
        build.onStart(() => console.log('[watch] build started'));
        build.onEnd(result => {
            for (const { text, location } of result.errors) {
                console.error(`✘ [ERROR] ${text}`);
                if (location) console.error(`    ${location.file}:${location.line}:${location.column}:`);
            }
            console.log('[watch] build finished');
        });
    }
};

const ctx = await context({
    entryPoints: [{ in: 'src/extension.ts', out: 'extension' }],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: true,
    sourcesContent: false,
    platform: 'node',
    outdir: 'dist',
    external: ['vscode', 'plaxtony', 'sc2-layout-lang'],
    logLevel: 'info',
    plugins: [esbuildProblemMatcherPlugin],
});

if (watch) { await ctx.watch(); }
else { await ctx.rebuild(); await ctx.dispose(); }
