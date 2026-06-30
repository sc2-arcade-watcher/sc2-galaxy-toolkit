import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'child_process';
import assert from 'node:assert';
import { createRegistry } from '../src/schema/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cspath = path.join(__dirname, '../sc-min.json');

function resolveSchemaDir(): string {
    if (typeof process.env.SC2LAYOUT_SCHEMA_DIR === 'string') {
        return process.env.SC2LAYOUT_SCHEMA_DIR;
    }
    const monorepoDefault = path.resolve(__dirname, '../../..', 'sc2-layout-schema', 'sc2layout');
    assert(fs.existsSync(monorepoDefault), `Schema dir not found at ${monorepoDefault}. Set SC2LAYOUT_SCHEMA_DIR env var.`);
    return monorepoDefault;
}

function generateSchemaCache(args: string[] = []) {
    const schemaDir = resolveSchemaDir();
    const result = spawnSync('node',
        [
            path.join(__dirname, '../src/bin/s2l-update-schema-cache.js'),
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

export const mochaGlobalSetup = async () => {
    // console.log(`mochaGlobalSetup start`);
    generateSchemaCache(['--pretty', '--skip-if-exists']);
    // console.log(`mochaGlobalSetup done`);
};

export const mochaGlobalTeardown = async () => {
    // console.log('mochaGlobalTeardown');
};

// console.log('bootstrap wait');
(<any>global)._cachedSchemaGen = () => {
    if (typeof (<any>global)._cachedSchema !== 'undefined') {
        return (<any>global)._cachedSchema;
    }
    if (!fs.existsSync(cspath)) {
        generateSchemaCache(['--pretty', '--skip-if-exists']);
    }
    return (<any>global)._cachedSchema = createRegistry(JSON.parse(fs.readFileSync(cspath, 'utf8')));
}
// console.log('bootstrap done');
