import anyTest, { TestInterface } from 'ava';
import schema from './care-bear-schema.json';
import { expandSchema, relationshipNames } from '../src/lib/schema-functions';
import { JsonQuerier } from '../src/queriers/json';

const test = anyTest as TestInterface<any>;

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
    },
    homes: {
      1: { name: 'Care-a-Lot', location: 'Clouds' },
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
  // relationships: {
  //   home: '1',
  // },
};

test.beforeEach(t => {
  t.context = { store: JsonQuerier(expandSchema(schema), storeState) };
});

test('fetches a single resource', t => {
  const result = t.context.store.get({ type: 'bears', id: '1' });

  t.deepEqual(result, {
    type: 'bears',
    id: '1',
    attributes: storeState.objects.bears['1'],
    relationships: {},
  });
});

test('fetches a single resource with a single relationship', t => {
  const result = t.context.store.get({
    type: 'bears',
    id: '1',
    relationships: { home: {} },
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

test('fetches multiple relationships of various types', t => {
  const result = t.context.store.get({
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

test('handles relationships between the same type', t => {
  const result = t.context.store.get({
    type: 'bears',
    relationships: {
      best_friend: {},
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
  ]);
});

test('creates new objects without relationships', t => {
  t.context.store.merge(grumpyBear);

  const result = t.context.store.get({
    type: 'bears',
    id: '4',
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '4',
    attributes: grumpyBear.attributes,
    relationships: {},
  });
});

test('creates new objects with a relationship', t => {
  t.context.store.merge({
    ...grumpyBear,
    relationships: { home: '1' },
  });

  const result = t.context.store.get({
    type: 'bears',
    id: '4',
    relationships: { home: {} },
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

test('merges into existing objects', t => {
  t.context.store.merge({
    type: 'bears',
    id: '2',
    attributes: { fur_color: 'carnation pink' },
  });

  const result = t.context.store.get({
    type: 'bears',
    id: '2',
  });

  t.deepEqual(result, {
    type: 'bears',
    id: '2',
    attributes: { ...storeState.objects.bears['2'], fur_color: 'carnation pink' },
    relationships: {},
  });
});

test('deletes objects', t => {
  t.context.store.delete({ type: 'bears', id: '1' });
  const result = t.context.store.get({
    type: 'bears',
    id: '4',
    relationships: { home: {} },
  });

  const relResult = t.context.store.get({
    type: 'homes',
    id: '1',
    relationships: { bears: {} },
  });

  t.is(result.attributes, undefined);
  t.is(relResult.relationships.bears.length, 2);
});

// need a non-symmetric self join relationship test
