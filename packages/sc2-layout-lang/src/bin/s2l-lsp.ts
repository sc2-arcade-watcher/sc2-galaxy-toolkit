import 'source-map-support/register';
import * as lsp from 'vscode-languageserver';
import { S2LServer } from '../lsp/server.js';

const conn = lsp.createConnection();
const server = new S2LServer(conn);
conn.listen();
