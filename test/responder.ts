import test from 'ava';
import schema from './care-bear-schema.json';
import { expandSchema } from '../src/lib/schema-functions';
import { JsonApiResponder } from '../src/responders/jsonapi';
import { ResultGraph, HydraError } from '../src/types';
import { Either, Ok } from '../src/lib/either';

const handler = (r: Either<HydraError, ResultGraph>) => JsonApiResponder(r, expandSchema(schema));

const tenderheart_attrs = {
  name: 'Tenderheart Bear',
  gender: 'male',
  belly_badge: 'heart',
  fur_color: 'tan',
};

const grumpy_attrs = {
  name: 'Grumpy Bear',
  gender: 'male',
  belly_badge: 'raincloud',
  fur_color: 'blue',
};

const carealot_attrs = {
  name: 'Care-a-Lot',
  location: 'clouds',
  caring_meter: 1,
};

test('responds on a result with one entry', async t => {
  const r: Either<HydraError, ResultGraph> = Ok({
    type: 'bears',
    cardinality: 'one',
    root: '1',
    resources: {
      bears: {
        1: tenderheart_attrs,
      }
    }
  });

  const res = await handler(r);

  t.deepEqual(JSON.parse(res.body).data, {
    type: 'bears',
    id: '1',
    attributes: tenderheart_attrs,
    relationships: {},
  });
});

test('responds on a result with multiple entries', async t => {
  const r: Either<HydraError, ResultGraph> = Ok({
    type: 'bears',
    cardinality: 'many',
    root: ['1', '3'],
    resources: {
      bears: {
        1: tenderheart_attrs,
        3: grumpy_attrs,
      }
    }
  });

  const res = await handler(r);

  t.deepEqual(JSON.parse(res.body).data, [{
    type: 'bears',
    id: '1',
    attributes: tenderheart_attrs,
    relationships: {},
  }, {
    type: 'bears',
    id: '3',
    attributes: grumpy_attrs,
    relationships: {},
  }]);
});

test.only('responds on a result with multiple entries and an included resource', async t => {
  const r: Either<HydraError, ResultGraph> = Ok({
    type: 'bears',
    cardinality: 'many',
    root: ['1', '3'],
    resources: {
      bears: {
        1: { ...tenderheart_attrs, home: { type: 'homes', id: '1' } },
        3: { ...grumpy_attrs, home: { type: 'homes', id: '1' } },
      },
      homes: {
        1: carealot_attrs,
      }
    }
  });

  const res = await handler(r);
  const body = JSON.parse(res.body);

  t.deepEqual(body.data, [{
    type: 'bears',
    id: '1',
    attributes: tenderheart_attrs,
    relationships: { home: { type: 'homes', id: '1' } },
  }, {
    type: 'bears',
    id: '3',
    attributes: grumpy_attrs,
    relationships: { home: { type: 'homes', id: '1' } },
  }]);

  t.deepEqual(body.included, [{
    type: 'homes',
    id: '1',
    attributes: carealot_attrs,
    relationships: {},
  }]);
});
