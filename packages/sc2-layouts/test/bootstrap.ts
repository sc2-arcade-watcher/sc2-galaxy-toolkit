import { generateSchema } from '../src/schema/registry';

(<any>global)._cachedSchema = generateSchema('test/fixtures/schema/sc2layout');
