import { context } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await context({
        entryPoints: [
            {
                in: 'client/src/extension.ts',
                out: 'extension',
            },
            {
                in: 'backend/src/bin/s2l-lsp.ts',
                out: 's2l-lsp',
            },
        ],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: true,
        sourcesContent: false,
        platform: 'node',
        outdir: 'dist',
        external: [
            'vscode'
        ],
        logLevel: 'info',
        plugins: [
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin
        ]
    });

    if (watch) {
        await ctx.watch();
    }
    else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

function formatCurrTime() {
    const cD = new Date();
    return `${cD.getHours().toString().padStart(2, '0')}:${cD.getMinutes().toString().padStart(2, '0')}.${cD.getMilliseconds().toString().padStart(3, '0')}`;
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log(`[watch] ${formatCurrTime()} build started`);
        });
        build.onEnd(result => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log(`[watch] ${formatCurrTime()} build finished`);
        });
    }
};

await main();
