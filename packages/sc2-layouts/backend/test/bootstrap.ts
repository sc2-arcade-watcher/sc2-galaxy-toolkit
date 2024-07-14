import * as fs from 'fs-extra';
import * as path from 'path';
import { spawnSync } from 'child_process';
import assert = require('assert');
import { createRegistry } from '../src/schema/registry';

const cspath = path.join(__dirname, '../sc-min.json');

function generateSchemaCache(args: string[] = []) {
    assert(typeof process.env.SC2LAYOUT_SCHEMA_DIR === 'string');
    const result = spawnSync('node',
        [
            path.join(__dirname, '../src/bin/s2l-update-schema-cache.js'),
            process.env.SC2LAYOUT_SCHEMA_DIR,
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
    return (<any>global)._cachedSchema = createRegistry(fs.readJSONSync(cspath));
}
// console.log('bootstrap done');
