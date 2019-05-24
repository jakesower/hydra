import http from 'http';
import config from './config.json';
import { hydra } from './src/index';
import { JsonApiRequestHandler } from './src/request-handlers/jsonapi';
import { SqliteQuerier } from './src/queriers/sqlite';
import { JsonApiResponder } from './src/responders/jsonapi';
import { HtmlResponder } from './src/responders/html';
import { Database } from "sqlite3";
import { expandSchema } from './src/lib/schema-functions';
import schema from './wc2019-schema.json';

const db = new Database('wc2019.db');

// const port = config.port;
const port = 20191;
const server = http.createServer(hydra(
  { '*/*': JsonApiRequestHandler },
  SqliteQuerier(db),
  { 'application/vnd.api+json': JsonApiResponder, 'text/html': HtmlResponder },
  expandSchema(schema),
));

server.listen(port);
console.log(`listening on port ${port}`);

