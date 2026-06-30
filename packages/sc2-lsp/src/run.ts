import { Server } from './galaxy/server.js';

const server = new Server();
server.createConnection().listen();
