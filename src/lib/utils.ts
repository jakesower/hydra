type Ord = number | string | boolean | Date;


export function appendKeys<T, K extends keyof T>(base: { [k: string]: T[K][] }, other: { [k: string]: T[K][] }): { [k: string] : T[K][] } {
  const keys = Object.keys(base);
  let result = {};
  for (let key of keys) {
    result[key] = [...base[key], ...other[key]];
  }
  return result;
}


export function chainPipeThru(val: any, fns: ((x: any) => any)[]) {
  return fns.reduce((acc, fn) => acc.chain(fn), val);
}


export function fgo(generator: () => IterableIterator<any>) {
  const recur = ({value, done}, gen) => {
    if (done) { return value; }
    return value.chain(v => recur(gen.next(v), gen));
  }

  let g = generator();
  return recur(g.next(), g);
}


// e.g. {a: {inner: 'thing'}, b: {other: 'item'}} => {a: {key: 'a', inner: 'thing'}, b: {key: 'b', other: 'item'}}
export function inlineKey<T, K extends keyof T>(obj: T): {[k: string]: T[K] & { key: string }} {
  let result = {};
  const keys = Object.keys(obj);
  for (let key of keys) {
    result[key] = Object.assign({}, obj[key], { key });
  }
  return result;
}


export function mapObj<T,U>(obj: {[k in string]: T}, fn: (x: T, idx: string) => U): ({[k in string]: U}) {
  const [keys, vals] = [Object.keys(obj), Object.values(obj)];
  const mappedVals = vals.map((v, idx) => fn(v, keys[idx]));
  return zipObj(keys, mappedVals);
}


export function maxStable<T>(fn: (a: T) => Ord, xs: T[]): T {
  const l = xs.length;
  let out = xs[0];
  let outVal = fn(out);

  for (let i = 1; i < l; i += 1) {
    const cur = xs[i];
    const curVal = fn(cur);

    if (curVal > outVal) {
      out = cur;
      outVal = curVal;
    }
  }

  return out;
}


export function mergeAll<T>(items: {[k in string]: T}[]): ({[k in string]: T}) {
  const init: ({[k in string]: T}) = {};
  return items.reduce((merged, arg) => ({ ...merged, ...arg }), init);
}


export function overPath(obj, path, fn) {
  if (path.length === 0) { return null; }

  const [head, ...tail] = path;

  if (path.length === 1) {
    return {
      ...obj,
      [head]: fn(obj[head]),
    }
  }

  return {
    ...obj,
    [head]: overPath(obj[head], tail, fn)
  };
}


export function pipe(fns: ((x: any) => any)[]): (x: any) => any {
  return fns.reduce((acc, fn) => val => fn(acc(val)), x => x);
}


export function pipeThru(val: any, fns: ((x: any) => any)[]): any {
  return pipe(fns)(val);
}


export function sortBy<T>(fn: (a: T, b: T) => number, xs: T[]): T[] {
  if (xs.length === 0) { return []; }
  const first = xs[0];
  const rest = xs.slice(1);
  let lts: T[] = [];
  let gts: T[] = [];
  let eqs: T[] = [first];
  for (let i = 0; i < rest.length; i += 1) {
    const comp = fn(rest[i], first);

    if (comp > 0) { gts.push(rest[i]); }
    else if (comp === 0) { eqs.push(rest[i]); }
    else { lts.push(rest[i]) }
  }

  return sortBy(fn, lts).concat(eqs).concat(sortBy(fn, gts));
}


export function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}


export function unnest<T>(xs: T[][]): T[] {
  return makeFlat(xs, false);
}


export function xprod<T,U>(xs: T[], ys: U[]): [T,U][] {
  const xl = xs.length;
  const yl = ys.length;
  let out: [T, U][] = [];

  for (let i = 0; i < xl; i += 1) {
    for (let j = 0; j < yl; j += 1) {
      out[out.length] = [xs[i], ys[j]];
    }
  }

  return out;
}


export function zipObj<T>(keys: string[], vals: T[]): { [k: string]: T } {
  return keys.reduce((out, key, idx) => {
    const o = {[key]: vals[idx]};
    return { ...out, ...o };
  }, {});
}



function makeFlat<T>(list, recursive): T[] {
  let result: T[] = [];
  let idx = 0;
  let ilen = list.length;

  while (idx < ilen) {
    if (Array.isArray(list[idx])) {
      let value = recursive ? makeFlat(list[idx], true) : list[idx];
      let j = 0;
      let jlen = value.length;
      while (j < jlen) {
        result[result.length] = value[j];
        j += 1;
      }
    } else {
      result[result.length] = list[idx];
    }
    idx += 1;
  }

  return result;
}