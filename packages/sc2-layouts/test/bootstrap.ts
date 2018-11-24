import { generateSchema } from '../src/schema/map';

(<any>global)._cachedSchema = generateSchema('schema');
