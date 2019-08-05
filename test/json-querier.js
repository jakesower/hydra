import test from 'ava';
import schema from './care-bear-schema.json';
import { expandSchema } from '../src/lib/schema-functions';
import { JsonQuerier } from '../src/queriers/json';

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
        name: 'Love-a-Lot Bear',
        gender: 'female',
        belly_badge: 'two hearts',
        fur_color: 'pink',
      },
    },
    homes: {
      1: { name: 'Care-a-Lot', location: 'Kingdom of Caring' },
      2: { name: 'Forest of Feelings', location: 'Kingdom of Caring' },
    },
  },
  relationships: {
    'bears/home': [
      { local: '1', foreign: '1' },
      { local: '2', foreign: '1' },
      { local: '3', foreign: '1' },
    ],
    'bears/best_friend': [{ local: '2', foreign: '3' }],
  },
};

const grumpyBear = {
  type: 'bears',
  id: '4',
  attributes: {
    name: 'Grumpy Bear',
    gender: 'male',
    belly_badge: 'raincloud',
    fur_color: 'blue',
  },
  relationships: {
    home: '1',
  },
};

test.beforeEach(t => {
  t.context = { store: JsonQuerier(expandSchema(schema), storeState) };
});

test('fetches a single resource', async t => {
  const result = await t.context.store({ get: { type: 'bears', id: '1' } });

  t.deepEqual(result, {
    type: 'bears',
    id: '1',
    attributes: storeState.objects.bears['1'],
    relationships: {},
  });
});

test('does not fetch a nonexistent resource', async t => {
  const result = await t.context.store({ get: { type: 'bears', id: '6' } });

  t.deepEqual(result, null);
});

test('fetches multiple resources', async t => {
  const result = await t.context.store({ get: { type: 'bears' } });

  t.deepEqual(result, [
    {
      type: 'bears',
      id: '1',
      attributes: storeState.objects.bears['1'],
      relationships: {},
    },
    {
      type: 'bears',
      id: '2',
      attributes: storeState.objects.bears['2'],
      relationships: {},
    },
    {
      type: 'bears',
      id: '3',
      attributes: storeState.objects.bears['3'],
      relationships: {},
    },
    {
      type: 'bears',
      id: '5',
      attributes: storeState.objects.bears['5'],
      relationships: {},
    },
  ]);
});

test('fetches a single resource with a single relationship', async t => {
  const result = await t.context.store({
    get: {
      type: 'bears',
      id: '1',
      relationships: { home: {} },
    },
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '1',
    attributes: storeState.objects.bears['1'],
    relationships: {
      home: {
        type: 'homes',
        id: '1',
        attributes: storeState.objects.homes['1'],
        relationships: {},
      },
    },
  });
});

test('fetches multiple relationships of various types', async t => {
  const result = await t.context.store({
    get: {
      type: 'bears',
      id: '1',
      relationships: {
        home: {
          relationships: {
            bears: {},
          },
        },
        powers: {},
      },
    },
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '1',
    attributes: storeState.objects.bears['1'],
    relationships: {
      home: {
        type: 'homes',
        id: '1',
        attributes: storeState.objects.homes['1'],
        relationships: {
          bears: [
            {
              type: 'bears',
              id: '1',
              attributes: storeState.objects.bears['1'],
              relationships: {},
            },
            {
              type: 'bears',
              id: '2',
              attributes: storeState.objects.bears['2'],
              relationships: {},
            },
            {
              type: 'bears',
              id: '3',
              attributes: storeState.objects.bears['3'],
              relationships: {},
            },
          ],
        },
      },
      powers: [],
    },
  });
});

test('handles relationships between the same type', async t => {
  const result = await t.context.store({
    get: {
      type: 'bears',
      relationships: {
        best_friend: {},
      },
    },
  });

  t.deepEqual(result, [
    {
      type: 'bears',
      id: '1',
      attributes: storeState.objects.bears['1'],
      relationships: { best_friend: null },
    },
    {
      type: 'bears',
      id: '2',
      attributes: storeState.objects.bears['2'],
      relationships: {
        best_friend: {
          type: 'bears',
          id: '3',
          attributes: storeState.objects.bears['3'],
          relationships: {},
        },
      },
    },
    {
      type: 'bears',
      id: '3',
      attributes: storeState.objects.bears['3'],
      relationships: {
        best_friend: {
          type: 'bears',
          id: '2',
          attributes: storeState.objects.bears['2'],
          relationships: {},
        },
      },
    },
    {
      type: 'bears',
      id: '5',
      attributes: storeState.objects.bears['5'],
      relationships: { best_friend: null },
    },
  ]);
});

test('creates new objects without relationships', async t => {
  t.context.store({ merge: grumpyBear });

  const result = await t.context.store({
    get: {
      type: 'bears',
      id: '4',
    },
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '4',
    attributes: grumpyBear.attributes,
    relationships: {},
  });
});

test('creates new objects with a relationship', async t => {
  await t.context.store({
    merge: {
      ...grumpyBear,
      relationships: { home: '1' },
    },
  });

  const result = await t.context.store({
    get: {
      type: 'bears',
      id: '4',
      relationships: { home: {} },
    },
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '4',
    attributes: grumpyBear.attributes,
    relationships: {
      home: {
        type: 'homes',
        id: '1',
        attributes: storeState.objects.homes['1'],
        relationships: {},
      },
    },
  });
});

test('merges into existing objects', async t => {
  await t.context.store({
    merge: {
      type: 'bears',
      id: '2',
      attributes: { fur_color: 'carnation pink' },
    },
  });

  const result = await t.context.store({
    get: {
      type: 'bears',
      id: '2',
    },
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '2',
    attributes: { ...storeState.objects.bears['2'], fur_color: 'carnation pink' },
    relationships: {},
  });
});

test('deletes objects', async t => {
  await t.context.store({ delete: { type: 'bears', id: '1' } });
  const result = await t.context.store({
    get: {
      type: 'homes',
      id: '1',
      relationships: { bears: {} },
    },
  });

  t.is(result.relationships.bears.length, 2);
});

test('replaces a to-one relationship', async t => {
  await t.context.store({
    replaceRelationship: {
      type: 'bears',
      id: '2',
      relationship: 'home',
      foreignId: '2',
    },
  });

  const bearResult = await t.context.store({
    get: {
      type: 'bears',
      id: '2',
      relationships: { home: {} },
    },
  });

  t.is(bearResult.relationships.home.attributes.name, 'Forest of Feelings');

  const careALotResult = await t.context.store({
    get: {
      type: 'homes',
      id: '1',
      relationships: { bears: {} },
    },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});

test('replaces a to-many-relationship', async t => {
  await t.context.store({
    replaceRelationships: {
      type: 'homes',
      id: '1',
      relationship: 'bears',
      foreignIds: ['1', '5'],
    },
  });

  const bearResult = await t.context.store({
    get: {
      type: 'bears',
      id: '2',
      relationships: { home: {} },
    },
  });

  t.is(bearResult.relationships.home, null);

  const loveALotResult = await t.context.store({
    get: {
      type: 'bears',
      id: '5',
      relationships: { home: {} },
    },
  });

  t.is(loveALotResult.relationships.home.attributes.name, 'Care-a-Lot');

  const careALotResult = await t.context.store({
    get: {
      type: 'homes',
      id: '1',
      relationships: { bears: {} },
    },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});

test('appends to a to-many relationship', async t => {
  await t.context.store({
    appendRelationships: {
      type: 'homes',
      id: '1',
      relationship: 'bears',
      foreignIds: ['1', '5'],
    },
  });

  const bearResult = await t.context.store({
    get: {
      type: 'bears',
      id: '5',
      relationships: { home: {} },
    },
  });

  t.is(bearResult.relationships.home.attributes.name, 'Care-a-Lot');

  const careALotResult = await t.context.store({
    get: {
      type: 'homes',
      id: '1',
      relationships: { bears: {} },
    },
  });

  t.is(careALotResult.relationships.bears.length, 4);
});

test('deletes a to-one relationship', async t => {
  await t.context.store({
    deleteRelationship: {
      type: 'bears',
      id: '1',
      relationship: 'home',
    },
  });

  const bearResult = await t.context.store({
    get: {
      type: 'bears',
      id: '1',
      relationships: { home: {} },
    },
  });

  t.is(bearResult.relationships.home, null);

  const careALotResult = await t.context.store({
    get: {
      type: 'homes',
      id: '1',
      relationships: { bears: {} },
    },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});

test('deletes a to-many relationship', async t => {
  await t.context.store({
    deleteRelationships: {
      type: 'homes',
      id: '1',
      relationship: 'bears',
      foreignIds: ['1'],
    },
  });

  const bearResult = await t.context.store({
    get: {
      type: 'bears',
      id: '1',
      relationships: { home: {} },
    },
  });

  t.is(bearResult.relationships.home, null);

  const careALotResult = await t.context.store({
    get: {
      type: 'homes',
      id: '1',
      relationships: { bears: {} },
    },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});
