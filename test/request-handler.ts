// import test from 'ava';
// import { createRequest } from 'node-mocks-http';
// import schema from './care-bear-schema.json';
// import { JsonApiRequestHandler } from '../src/request-handlers/jsonapi';
// import { expandSchema } from '../src/lib/schema-functions';

// const handler = r => JsonApiRequestHandler(r, expandSchema(schema));

// test('valid multi jsonapi request', async t => {
//   const r = createRequest({
//     method: 'GET',
//     url: '/bears',
//   });

//   const res = await handler(r);
//   const v = res.getOkValue();

//   t.deepEqual(v, {
//     action: 'query',
//     cardinality: 'many',
//     constraints: [],
//     type: 'bears',
//     relationships: {},
//   });
// });


// test('valid single jsonapi request', async t => {
//   const r = createRequest({
//     method: 'GET',
//     url: '/bears/2',
//   });

//   const res = await handler(r);
//   const v = res.getOkValue();

//   t.deepEqual(v, {
//     action: 'query',
//     cardinality: 'one',
//     constraints: [{
//       type: 'equal',
//       field: 'id',
//       value: '2',
//     }],
//     type: 'bears',
//     relationships: {},
//   });
// });


// test('invalid jsonapi request', async t => {
//   const r = createRequest({
//     method: 'GET',
//     url: '/chickens',
//   });

//   const res = await handler(r);

//   t.assert(res.isErr());
// });


// test('jsonapi request with a hard unrecognized param', async t => {
//   const r = createRequest({
//     method: 'GET',
//     url: '/bears/2?unknown=uhoh',
//   });

//   const res = await handler(r);

//   t.assert(res.isErr());
// });


// test('jsonapi request with a soft unrecognized param', async t => {
//   const r = createRequest({
//     method: 'GET',
//     url: '/bears/2?unknownThing=letitslide',
//   });

//   const res = await handler(r);

//   t.assert(res.isOk());
// });


// test('jsonapi request with an included param', async t => {
//   const r = createRequest({
//     method: 'GET',
//     url: '/bears/2?include=home.bears,powers',
//   });

//   const res = await handler(r);
//   const v = res.getOkValue();

//   t.deepEqual(Object.keys(v.relationships), ['home', 'powers']);
//   t.deepEqual(Object.keys(v.relationships.home.relationships), ['bears']);
//   t.deepEqual(Object.keys(v.relationships.home.relationships.bears.relationships), []);
// });
