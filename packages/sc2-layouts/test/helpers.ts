import * as path from 'path';
import * as fs from 'fs';
import { generateSchema } from '../src/schema/map';
import { Store } from '../src/index/store';
import { SchemaRegistry } from '../src/schema/base';
import URI from 'vscode-uri';

let _schema: SchemaRegistry;
export function getSchema() {
    if (!_schema) {
        _schema = generateSchema('schema');
    }
    return _schema;
}

export function getFixturePath(...src: string[]) {
    return path.resolve(path.join('test', 'fixtures', ...src));
}

export interface MockupStoreOptions {
    fprefix?: string;
}

export function buildStore(opts: MockupStoreOptions = {}, ...filenames: string[]) {
    const store = new Store(getSchema());
    opts.fprefix = opts.fprefix ? path.join(getFixturePath(), opts.fprefix) : getFixturePath();
    for (const tmp of filenames) {
        const uri = URI.file(path.join(opts.fprefix, `${tmp}.SC2Layout`));
        store.updateDocument(uri.toString(), fs.readFileSync(uri.fsPath, 'utf8'));
    }
    return store;
}
