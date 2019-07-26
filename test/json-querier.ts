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
        fur_color: 'carnation pink',
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
      { bears: '1', homes: '1' },
      { bears: '2', homes: '1' },
      { bears: '3', homes: '1' },
    ],
    'bears/best_friend': [{ left: '2', right: '3' }],
  },
};

const store = JsonQuerier(expandSchema(schema), storeState);

test('fetches a single resource', t => {
  const result = store.get({ type: 'bears', id: '1' });

  t.deepEqual(result, {
    type: 'bears',
    id: '1',
    attributes: storeState.objects.bears['1'],
    relationships: {},
  });
});

test('fetches a single resource with a single relationship', t => {
  const result = store.get({
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
  const result = store.get({
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
  const result = store.get({
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
