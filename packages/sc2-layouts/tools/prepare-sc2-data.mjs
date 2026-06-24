import { ok } from 'node:assert';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';

const reExclude = [
    /(dede|eses|esmx|frfr|itit|kokr|plpl|ptbr|ruru|zhcn|zhtw)\.sc2data'/i,
    /(PreloadAssetDB|TextureReductionValues)\.txt$'/i,
    /\.(StormMod|StormMap)/i,
    /\/base[0-9]*\.sc2maps/i,
    /mods\/mutators/i,
];
const reInclude = [
    /\/(DocumentInfo)$/i,
    /(\/GameHotkeys\.txt|\/GameStrings\.txt|\/Assets(Product)?\.txt|\/BuildId\.txt|\/DataBuildId\.txt)$/i,
    /\.(SC2Style|SC2Components|SC2Layout)$/i,
];

async function main() {
    const srcDir = process.env.SC2GAMEDATA_DIR;
    const destDir = process.env.SC2LAYOUTDATA_OUT_DIR;
    const preserveDest = process.argv.includes('--preserve');
    ok(typeof srcDir === 'string');
    ok(typeof destDir === 'string');

    if (!preserveDest) {
        /** @type fs.Stats */
        let stInfo = void 0;
        try {
            stInfo = await fsp.stat(destDir);
        }
        catch {}

        if (stInfo) {
            if (stInfo.isDirectory() === true) {
                console.log(`cleaning ${destDir} ..`);
                await fsp.rm(destDir, { recursive: true });
            }
            else {
                console.error(`not a directory ${destDir} ??`);
            }
        }
    }

    let i = 0;

    for (const item of await glob(`**`, { nodir: true, cwd: srcDir })) {
        if (reExclude.findIndex(x => x.test(item)) !== -1) continue;
        if (reInclude.findIndex(x => x.test(item)) === -1) continue;

        await fsp.mkdir(path.join(destDir, path.dirname(item)), {
            recursive: true,
        });
        await fsp.copyFile(path.join(srcDir, item), path.join(destDir, item));
        i++;
        // console.log(path.join(destDir, item));
    }

    console.log(`${i} files copied to ${destDir}`);
}

await main();
