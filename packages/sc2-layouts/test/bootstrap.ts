import { generateSchema } from '../src/schema/map';

(<any>global)._cachedSchema = generateSchema('test/fixtures/schema/sc2layout');
