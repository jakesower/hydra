import test from 'ava';
import { finalizablePipe } from '../src/lib/finalizable-pipe';

const mws = {
  id: function*(val) {
    return val;
  },
  double: function*(val, next) {
    return (yield next(val)) * 2;
  },
  add1: function*(val, next) {
    return (yield next(val)) + 1;
  },
  freeze: function*(val, next, finalize) {
    return finalize(val);
  },
  delayedAdd1: async function*(val, next) {
    const n = yield next(val);
    const r = await Promise.resolve(n + 1);

    return r;
  },
};

test('works with no mws', async t => {
  const pipe = finalizablePipe([]);

  t.deepEqual(await pipe(5), 5);
});

test('works with id', async t => {
  const pipe = finalizablePipe([mws.id]);

  t.deepEqual(await pipe(5), 5);
});

test('works with one mw', async t => {
  const pipe = finalizablePipe([mws.add1]);

  t.deepEqual(await pipe(5), 6);
});

test('creates a standard mw pipe', async t => {
  const pipe = finalizablePipe([mws.double, mws.add1]);

  t.deepEqual(await pipe(5), 12);
});

test('creates a finalizable mw pipe', async t => {
  const pipe = finalizablePipe([mws.double, mws.add1, mws.freeze]);

  t.deepEqual(await pipe(5), 5);
});

test('works with async mw', async t => {
  const pipe = finalizablePipe([mws.add1, mws.delayedAdd1]);

  t.deepEqual(await pipe(5), 7);
});
