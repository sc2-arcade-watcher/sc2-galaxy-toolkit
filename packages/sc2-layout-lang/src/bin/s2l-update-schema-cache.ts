import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { readSchemaDataDir } from '../schema/registry.js';

async function cacheSchema(sDir: string, targetFilename: string, flags: ('--pretty' | '--skip-if-exists')[]) {
    if (flags.includes('--skip-if-exists') && fs.existsSync(targetFilename)) {
        return;
    }

    const sData = await readSchemaDataDir(sDir, { includeLocalization: false });
    await fsp.mkdir(path.dirname(targetFilename), { recursive: true });
    await fsp.writeFile(targetFilename, JSON.stringify(sData, null, flags.includes('--pretty') ? 2 : undefined), 'utf8');
}

if (process.argv.length < 4) throw new Error('missing required args');
cacheSchema(process.argv[2], process.argv[3], process.argv.slice(4) as any);
