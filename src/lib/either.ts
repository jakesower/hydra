import { zipObj } from './utils';

interface Eith<E, O> {
  chain<T>(fn: (value: O) => Either<E, T>): Either<E, T>;
  map<T>(fn: (value: O) => T): Either<E, T>;
  mapErr<T>(fn: (value: E) => T): Either<T, O>;
  isOk(): boolean;
  isErr(): boolean;
  hasValue(value: O): boolean;
  getOkValue(): O;
  getErrValue(): E;
  split<T>(errFn: (val: E) => T, okFn: (val: O) => T): T;
}

class EitherOk<E, O> implements Eith<E, O> {
  constructor(private value: O) {}

  recoverWith<T>(_defaultValue: T): T | O {
    return this.value;
  }

  map<T>(fn: (value: O) => T): Either<E, T> {
    return new EitherOk<E, T>(fn(this.value));
  }

  chain<T>(fn: (value: O) => Either<E, T>): Either<E, T> {
    return fn(this.value);
  }

  split<T>(_errFn: (val: E) => T, okFn: (val: O) => T): T {
    return okFn(this.value);
  }

  mapErr<T>(_fn: (value: E) => T): Either<T, O> {
    return new EitherOk<T, O>(this.value);
  }

  hasValue(value) {
    return this.value === value;
  }

  isOk() {
    return true;
  }
  isErr() {
    return false;
  }

  getOkValue(): O {
    return this.value;
  }

  getErrValue(): E {
    throw "Can't get an err value from an ok!";
  }
}

class EitherErr<E, O> implements Eith<E, O> {
  constructor(private value: E) {}

  recoverWith<T>(defaultValue: T): T {
    return defaultValue;
  }

  map<T>(_fn: (value: O) => T): Either<E, T> {
    return new EitherErr<E, T>(this.value);
  }

  chain<T>(_fn: (value: O) => Either<E, T>): Either<E, T> {
    return new EitherErr<E, T>(this.value);
  }

  split<T>(errFn: (val: E) => T, _okFn: (val: O) => T): T {
    return errFn(this.value);
  }

  mapErr<T>(fn: (value: E) => T): Either<T, O> {
    return new EitherErr<T, O>(fn(this.value));
  }

  hasValue(_value) {
    return false;
  }

  isOk() {
    return false;
  }

  isErr() {
    return true;
  }

  getOkValue(): O {
    throw "Can't get an ok value from an err!";
  }

  getErrValue(): E {
    return this.value;
  }
}

export type Either<E, O> = EitherOk<E, O> | EitherErr<E, O>;

export function Ok<E, O>(value: O): Either<E, O> {
  return new EitherOk(value);
}

export function Err<E, O>(value: E): Either<E, O> {
  return new EitherErr(value);
}

export function sequenceList<T, U>(eithers: Either<T, U>[]): Either<T, U[]> {
  const l = eithers.length;
  const out = <U[]>[];
  for (let i = 0; i < l; i += 1) {
    const e = eithers[i];
    if (e.isErr()) {
      return (e as unknown) as Either<T, U[]>;
    }
    out[i] = e.recoverWith(null) as U;
  }
  return Ok<T, U[]>(out);
}

export function sequenceObj<T, U>(eithers: {
  [k: string]: Either<T, U>;
}): Either<T, { [k: string]: U }> {
  const keys = Object.keys(eithers);
  const vals = Object.values(eithers);
  const l = vals.length;
  const out = <U[]>[];
  for (let i = 0; i < l; i += 1) {
    const e = vals[i];
    if (e.isErr()) {
      return (e as unknown) as Either<T, { [k: string]: U }>;
    }
    out[i] = e.recoverWith(null) as U;
  }
  return Ok(zipObj(keys, out));
}

export function sequencePromise<E, O>(
  eitherPromise: Either<E, Promise<O>>
): Promise<Either<E, O>> {
  if (eitherPromise.isErr()) {
    return (Promise.resolve(eitherPromise) as unknown) as Promise<Either<E, O>>;
  }

  return eitherPromise.getOkValue().then(val => Ok<E, O>(val));
}

export function flattenEither<E, O>(e: Either<E, Either<E, O>>): Either<E, O> {
  return e.isErr() ? ((e as unknown) as Either<E, O>) : e.getOkValue();
}
