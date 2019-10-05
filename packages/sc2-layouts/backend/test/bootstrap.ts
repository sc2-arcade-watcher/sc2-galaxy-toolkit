import * as fs from 'fs-extra';
import { createRegistry } from '../src/schema/registry';

(<any>global)._cachedSchema = createRegistry(fs.readJSONSync('test/fixtures/schema/sc-min.json'));
