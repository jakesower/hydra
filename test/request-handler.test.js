import test from 'ava';
import { createRequest } from 'node-mocks-http';
import rawSchema from './care-bear-schema.json';
import { JsonQuerier } from '../src/queriers/json';
import { JsonApiRequestHandler } from '../src/request-handlers/jsonapi';
import { expandSchema } from '../src/lib/schema-functions';
import { tag, untag } from '../src/lib/element-tags';

const storeState = {
  objects: {
    bears: {
      1: {
        name: 'Tenderheart Bear',
        gender: 'male',
        belly_badge: 'heart',
        fur_color: 'tan',
      },
      2: {
        name: 'Cheer Bear',
        gender: 'female',
        belly_badge: 'rainbow',
        fur_color: 'pink',
      },
      3: {
        name: 'Wish Bear',
        gender: 'female',
        belly_badge: 'shooting star',
        fur_color: 'turquoise',
      },
      5: {
        name: 'Wonderheart Bear',
        gender: 'female',
        belly_badge: 'three hearts',
        fur_color: 'pink',
      },
    },
    homes: {
      1: { name: 'Care-a-Lot', location: 'Kingdom of Caring' },
      2: { name: 'Forest of Feelings', location: 'Kingdom of Caring' },
    },
    powers: {
      careBearStare: { name: 'Care Bear Stare', description: 'Defeats enemies and heal friends' },
    },
  },
  relationships: {
    'bears/home': [
      { local: '1', foreign: '1' },
      { local: '2', foreign: '1' },
      { local: '3', foreign: '1' },
    ],
    'bears/best_friend': [{ local: '2', foreign: '3' }],
    'bears/powers': [
      { local: '1', foreign: 'careBearStare' },
      { local: '2', foreign: 'careBearStare' },
      { local: '3', foreign: 'careBearStare' },
    ],
  },
};

const bearToResource = id => {
  const bear = storeState.objects.bears[id];
  return {
    attributes: bear,
    id: id,
    type: 'bears',
    relationships: {},
  };
};

const bearResources = Object.keys(storeState.objects.bears).map(bearToResource);

const schema = expandSchema(rawSchema);

test.beforeEach(t => {
  t.context = {
    handler: r =>
      JsonApiRequestHandler({
        schema,
        querier: JsonQuerier(schema, storeState),
        request: r,
      }),
  };
});

test('valid multi jsonapi request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears',
  });

  const res = await t.context.handler(r);

  t.deepEqual(
    res,
    tag('query-result', {
      rootType: 'bears',
      result: bearResources,
    })
  );
});

test('valid single jsonapi request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/2',
  });

  const res = await t.context.handler(r);

  t.deepEqual(res, tag('query-result', { rootType: 'bears', result: bearToResource('2') }));
});

test('invalid jsonapi request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/chickens',
  });

  const res = await t.context.handler(r);

  t.deepEqual(untag(res).tag, 'error');
});

test('related resource request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/2/home',
  });

  const res = await t.context.handler(r);

  t.deepEqual(
    res,
    tag('query-result', {
      rootType: 'homes',
      result: {
        type: 'homes',
        id: '1',
        attributes: {
          name: 'Care-a-Lot',
          location: 'Kingdom of Caring',
        },
        relationships: {},
      },
    })
  );
});

test('to-one relationship request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/2/relationships/home',
  });

  const res = await t.context.handler(r);

  t.deepEqual(res, {
    relationship: {
      rootType: 'bears',
      result: {
        type: 'bears',
        id: '2',
        attributes: storeState.objects.bears[2],
        relationships: {
          home: {
            attributes: { location: 'Kingdom of Caring', name: 'Care-a-Lot' },
            id: '1',
            relationships: {},
            type: 'homes',
          },
        },
      },
    },
  });
});

test('to-many relationship request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/homes/1/relationships/bears',
  });

  const res = await t.context.handler(r);

  t.deepEqual(res, {
    relationship: {
      rootType: 'homes',
      result: {
        type: 'homes',
        id: '1',
        attributes: storeState.objects.homes[1],
        relationships: {
          bears: bearResources.filter(b => b.id < 5),
        },
      },
    },
  });
});

// param tests

test('jsonapi request with a hard unrecognized param', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/2?unknown=uhoh',
  });

  const res = await t.context.handler(r);

  t.deepEqual(untag(res).tag, 'error');
});

test('jsonapi request with a soft unrecognized param', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/2?unknownThing=letitslide',
  });

  const res = await t.context.handler(r);

  t.deepEqual(untag(res).tag, 'query-result');
});

test('jsonapi request with an included param', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/2?include=home.bears,powers',
  });

  const res = await t.context.handler(r);
  const v = untag(res).value.result;

  t.deepEqual(Object.keys(v.relationships), ['home', 'powers']);
  t.deepEqual(Object.keys(v.relationships.home.relationships), ['bears']);
  t.assert(Object.keys(v.relationships.home.relationships.bears[0].relationships), []);
});

test('jsonapi request with an included param on a related resource', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/homes/1/bears?include=home',
  });

  const res = await t.context.handler(r);
  const v = untag(res).value.result[0];

  t.deepEqual(untag(res).value.rootType, 'bears');
  t.deepEqual(v.relationships, {
    home: {
      attributes: { location: 'Kingdom of Caring', name: 'Care-a-Lot' },
      id: '1',
      relationships: {},
      type: 'homes',
    },
  });
});

test('sparse fieldsets', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/3?fields[bears]=name,fur_color',
  });

  const res = await t.context.handler(r);

  t.deepEqual(
    res,
    tag('query-result', {
      rootType: 'bears',
      result: {
        attributes: { name: 'Wish Bear', fur_color: 'turquoise' },
        id: '3',
        type: 'bears',
        relationships: {},
      },
    })
  );
});

test('sparse fieldsets in related resources', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/3?fields[bears]=name,fur_color&fields[homes]=location&include=home',
  });

  const res = await t.context.handler(r);

  t.deepEqual(
    res,
    tag('query-result', {
      rootType: 'bears',
      result: {
        attributes: { name: 'Wish Bear', fur_color: 'turquoise' },
        id: '3',
        type: 'bears',
        relationships: {
          home: {
            attributes: { location: 'Kingdom of Caring' },
            id: '1',
            relationships: {},
            type: 'homes',
          },
        },
      },
    })
  );
});

test('sparse fieldsets with a null request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears/300?fields[bears]=name,fur_color&fields[homes]=location&include=home',
  });

  const res = await t.context.handler(r);

  t.deepEqual(res, tag('query-result', { result: null, rootType: 'bears' }));
});

test('sparse fieldsets with a missing related request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/homes/300/bears?fields[bears]=name,fur_color&fields[homes]=location&include=home',
  });

  const res = await t.context.handler(r);

  t.deepEqual(untag(res).value.code, 404);
});

test('sorted request', async t => {
  const r = createRequest({
    method: 'GET',
    url: '/bears?sort=-fur_color,name',
  });

  const res = await t.context.handler(r);
  const { value, tag } = untag(res);

  t.deepEqual(tag, 'query-result');
  t.deepEqual(value.result.map(r => r.id), ['3', '1', '2', '5']);
});
