// import test from 'ava';
// import sqlite3 from 'sqlite3';
// import schema from './care-bear-schema.json';
// import { expandSchema } from '../src/lib/schema-functions';
// import { SqliteQuerier } from '../src/queriers/sqlite';
// import { TopQueryGraph } from '../src/types.js';

// const sqlite = sqlite3.verbose();
// const db = new sqlite.Database(':memory:');

// const homeRel = { type: 'homes', cardinality: 'one', constraints: [], relationships: {} };
// const caralot = { name: 'Care-a-Lot', location: 'Clouds', caring_meter: 1 };


// test.before.cb(t => {
//   db.serialize(() => {
//     db.run('CREATE TABLE bears (id TEXT, name TEXT, gender TEXT, belly_badge TEXT, fur_color TEXT, homes_id TEXT)');
//     db.run('CREATE TABLE homes (id TEXT, name TEXT, location TEXT, caring_meter REAL)');
//     db.run('CREATE TABLE powers (id TEXT, name TEXT, description TEXT)');
//     db.run('CREATE TABLE bears_powers (bears_id TEXT, powers_id TEXT)');

//     db.run("INSERT INTO bears VALUES ('1', 'Tenderheart Bear', 'male', 'heart', 'tan', '1')");
//     db.run("INSERT INTO bears VALUES ('2', 'Cheer Bear', 'female', 'rainbow', 'carnation pink', '1')");

//     db.run("INSERT INTO homes VALUES ('1', 'Care-a-Lot', 'Clouds', 1)");

//     db.run("INSERT INTO powers VALUES ('1', 'Care Bear Stare', 'Purges evil.')");

//     db.run("INSERT INTO bears_powers VALUES ('1', '1')");
//     db.run("INSERT INTO bears_powers VALUES ('2', '1')", t.end);
//   });
// });

// const handler = q => SqliteQuerier(db)(q, expandSchema(schema));


// test('queries a valid request for a single resource', async t => {
//   const q = {
//     action: 'query',
//     type: 'bears',
//     cardinality: 'one',
//     constraints: [{ type: 'equal', field: 'id', value: '1' }],
//     relationships: {},
//   };

//   const res = await handler(q);

//   t.deepEqual(res.getOkValue(), {
//     type: 'bears',
//     cardinality: 'one',
//     root: '1',
//     resources: {
//       bears: {
//         1: {
//           name: 'Tenderheart Bear',
//           gender: 'male',
//           belly_badge: 'heart',
//           fur_color: 'tan',
//         }
//       }
//     },
//   });
// });

// test('queries a valid request for a set of resources', async t => {
//   const q = {
//     type: 'bears',
//     cardinality: 'many',
//     constraints: [],
//     relationships: {},
//   };

//   const res = await handler(q);

//   t.deepEqual(res.getOkValue(), {
//     type: 'bears',
//     cardinality: 'many',
//     root: ['1', '2'],
//     resources: {
//       bears: {
//         1: {
//           name: 'Tenderheart Bear',
//           gender: 'male',
//           belly_badge: 'heart',
//           fur_color: 'tan',
//         },
//         2: {
//           name: 'Cheer Bear',
//           gender: 'female',
//           belly_badge: 'rainbow',
//           fur_color: 'carnation pink',
//         }
//       }
//     },
//   });
// });


// test('queries through a many-to-one join', async t => {
//   const q: TopQueryGraph = {
//     action: 'query',
//     type: 'bears',
//     cardinality: 'one',
//     constraints: [{ type: 'equal', field: 'id', value: '1' }],
//     relationships: {
//       home: {
//         type: 'homes',
//         cardinality: 'one',
//         constraints: [],
//         relationships: {},
//       },
//     },
//   };

//   const res = await handler(q);

//   t.deepEqual(res.getOkValue(), {
//     type: 'bears',
//     cardinality: 'one',
//     root: '1',
//     resources: {
//       bears: {
//         1: {
//           name: 'Tenderheart Bear',
//           gender: 'male',
//           belly_badge: 'heart',
//           fur_color: 'tan',
//           home: { type: 'homes', id: '1' }
//         }
//       },
//       homes: {
//         1: {
//           name: 'Care-a-Lot',
//           location: 'Clouds',
//           caring_meter: 1,
//         }
//       }
//     }
//   });
// });


// test('queries a valid request for a single resource with a join', async t => {
//   const q = {
//     type: 'bears',
//     cardinality: 'one',
//     constraints: [{ type: 'equal', field: 'id', value: '1' }],
//     relationships: { home: homeRel },
//   };

//   const res = await handler(q);

//   t.deepEqual(res.getOkValue(), {
//     type: 'bears',
//     cardinality: 'one',
//     root: '1',
//     resources: {
//       bears: {
//         1: {
//           name: 'Tenderheart Bear',
//           gender: 'male',
//           belly_badge: 'heart',
//           fur_color: 'tan',
//           home: { type: 'homes', id: '1' },
//         }
//       },
//       homes: { 1: caralot },
//     },
//   });
// });
