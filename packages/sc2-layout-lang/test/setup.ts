import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { createRegistry } from '../src/schema/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const cspath = path.join(pkgRoot, 'sc-min.json');

(<any>global)._cachedSchemaGen = () => {
    if (typeof (<any>global)._cachedSchema !== 'undefined') {
        return (<any>global)._cachedSchema;
    }
    return (<any>global)._cachedSchema = createRegistry(JSON.parse(fs.readFileSync(cspath, 'utf8')));
}
