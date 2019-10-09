import * as fs from 'fs-extra';
import * as path from 'path';
import { createRegistry } from '../src/schema/registry';

(<any>global)._cachedSchema = createRegistry(fs.readJSONSync(path.join(__dirname, '../../test', 'fixtures/schema/sc-min.json')));
