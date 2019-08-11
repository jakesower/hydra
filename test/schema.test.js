import test from 'ava';
import schema from './care-bear-schema.json';
import { expandSchema } from '../src/lib/schema-functions';

test('fails to validate an empty schema', t => {
  t.throws(() => expandSchema({}));
});

test('fails to validate a schema with a bad resource name', t => {
  t.throws(() =>
    expandSchema({
      resources: {
        'bad-name': {},
      },
    })
  );
});

test('fails to validate a schema with a relationship missing a valid inverse', t => {
  t.throws(() =>
    expandSchema({
      resources: {
        bad: {
          attributes: [{ thing: { type: 'string' } }],
          relationships: {
            noninvertable: {
              type: 'good',
              cardinality: 'many',
              inverse: 'missing',
            },
          },
        },
      },
    })
  );
});

test('expands schema', async t => {
  t.deepEqual(expandSchema(schema), {
    title: 'Care Bear Schema',
    resources: {
      bears: {
        key: 'bears',
        attributes: {
          name: { type: 'string', key: 'name' },
          gender: { type: 'string', key: 'gender' },
          belly_badge: { type: 'string', key: 'belly_badge' },
          fur_color: { type: 'string', key: 'fur_color' },
        },
        relationships: {
          home: {
            key: 'home',
            type: 'homes',
            cardinality: 'one',
            inverse: 'bears',
          },
          powers: {
            key: 'powers',
            type: 'powers',
            cardinality: 'many',
            inverse: 'bears',
          },
          best_friend: {
            cardinality: 'one',
            inverse: 'best_friend',
            key: 'best_friend',
            type: 'bears',
          },
        },
      },

      homes: {
        key: 'homes',
        attributes: {
          name: { type: 'string', key: 'name' },
          location: { type: 'string', key: 'location' },
          caring_meter: { type: 'number', key: 'caring_meter' },
        },
        relationships: {
          bears: {
            key: 'bears',
            type: 'bears',
            cardinality: 'many',
            inverse: 'home',
          },
        },
      },

      powers: {
        key: 'powers',
        attributes: {
          name: { type: 'string', key: 'name' },
          description: { type: 'text', key: 'description' },
        },
        relationships: {
          bears: {
            key: 'bears',
            type: 'bears',
            cardinality: 'many',
            inverse: 'powers',
          },
        },
      },
    },
  });
});
