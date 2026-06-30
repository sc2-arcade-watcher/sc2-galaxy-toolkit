import * as lsp from 'vscode-languageserver/node';
import { S2LServer } from '../lsp/server.js';

const conn = lsp.createConnection(lsp.ProposedFeatures.all);
const server = new S2LServer(conn);
conn.listen();
