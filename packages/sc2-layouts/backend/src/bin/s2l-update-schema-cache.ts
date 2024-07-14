import * as fs from 'fs-extra';
import { readSchemaDataDir } from '../schema/registry';

async function cacheSchema(sDir: string, targetFilename: string, flags: ('--pretty' | '--skip-if-exists')[]) {
    if (flags.includes('--skip-if-exists') && fs.pathExistsSync(targetFilename)) {
        return;
    }

    const sData = await readSchemaDataDir(sDir, { includeLocalization: false });
    await fs.ensureFile(targetFilename);
    await fs.writeJSON(targetFilename, sData, {
        encoding: 'utf8',
        spaces: flags.includes('--pretty') ? 2 : void 0,
    });
}

if (process.argv.length < 4) throw new Error('missing required args');
cacheSchema(process.argv[2], process.argv[3], process.argv.slice(4) as any);
