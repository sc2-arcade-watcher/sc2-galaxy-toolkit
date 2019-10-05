import * as lsp from 'vscode-languageserver';
import { S2LServer } from '../lsp/server';

const conn = lsp.createConnection();
const server = new S2LServer(conn);
conn.listen();
