import * as path from 'path';
import { Server } from 'plaxtony/lib/service/server';

const server = new Server();
server.createConnection().listen();
