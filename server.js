import http from 'http';
import config from './config.json';
import { hydra } from './src/index';
import { JsonApiRequestHandler } from './src/request-handlers/jsonapi';
import { SqliteQuerier } from './src/queriers/sqlite';
import { JsonQuerier } from './src/queriers/json';
import { JsonApiResponder } from './src/responders/jsonapi';
import { HtmlResponder } from './src/responders/html';
import { Database } from 'sqlite3';
import { expandSchema } from './src/lib/schema-functions';
import schema from './wc2019-schema.json';

const db = new Database('wc2019.db');

// const port = config.port;
const fullSchema = expandSchema(schema);
const port = 20191;
const server = http.createServer(
  hydra(
    { '*/*': JsonApiRequestHandler },
    JsonQuerier(fullSchema, { objects: { games: { game1: { name: 'Game 1' } } } }),
    {
      // 'application/vnd.api+json': JsonApiResponder,
      // 'text/html': HtmlResponder,
      '*/*': JsonApiResponder(fullSchema),
    },
    fullSchema
  )
);

server.listen(port);
console.log(`listening on port ${port}`);
