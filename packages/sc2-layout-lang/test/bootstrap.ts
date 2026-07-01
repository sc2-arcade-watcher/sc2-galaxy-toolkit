import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'child_process';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const cspath = path.join(pkgRoot, 'sc-min.json');

function resolveSchemaDir(): string {
    if (typeof process.env.SC2LAYOUT_SCHEMA_DIR === 'string') {
        return process.env.SC2LAYOUT_SCHEMA_DIR;
    }
    const monorepoDefault = path.resolve(__dirname, '../..', 'sc2-layout-schema', 'sc2layout');
    assert(fs.existsSync(monorepoDefault), `Schema dir not found at ${monorepoDefault}. Set SC2LAYOUT_SCHEMA_DIR env var.`);
    return monorepoDefault;
}

function generateSchemaCache(args: string[] = []) {
    const schemaDir = resolveSchemaDir();
    const result = spawnSync('node',
        [
            path.join(pkgRoot, 'lib/src/bin/s2l-update-schema-cache.js'),
            schemaDir,
            cspath,
            ...args
        ],
        {
            timeout: 10000,
            shell: false,
            encoding: 'utf8',
        },
    );
    if (result.status !== 0) throw result;
}

export const setup = async () => {
    generateSchemaCache(['--pretty', '--skip-if-exists']);
};

export const teardown = async () => {
};
