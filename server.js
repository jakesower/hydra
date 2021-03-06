import http from 'http';
import config from './config.json';
import { hydra } from './src/index';
import { JsonApiRequestHandler } from './src/request-handlers/jsonapi';
import { SqliteQuerier } from './src/queriers/sqlite';
import { MemoryStore } from '@polygraph/memory-store';
import { JsonApiResponder } from './src/responders/jsonapi';
import { HtmlResponder } from './src/responders/html';
import { Database } from 'sqlite3';
import { expandSchema } from '@polygraph/schema-utils';
import schema from './wc2019-schema.json';

const db = new Database('wc2019.db');

const testBase = {
  objects: {
    games: { game1: { name: 'Game 1' } },
    players: { fuzz: { name: 'Fuzz', bracket: 'yeah' }, future: { name: 'Future', bracket: 'no' } },
  },
  relationships: {
    'games/players': [{ local: 'game1', foreign: 'fuzz' }, { local: 'game1', foreign: 'future' }],
  },
};

// const port = config.port;
const fullSchema = expandSchema(schema);
const port = 20191;
const server = http.createServer(
  hydra({
    requestHandlers: { '*/*': JsonApiRequestHandler },
    querier: MemoryStore(fullSchema, testBase),
    responders: {
      // 'application/vnd.api+json': JsonApiResponder,
      // 'text/html': HtmlResponder,
      '*/*': JsonApiResponder(fullSchema),
    },
    schema: fullSchema,
  })
);

server.listen(port);
console.log(`listening on port ${port}`);
