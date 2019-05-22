"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class EitherOk {
    constructor(value) {
        this.value = value;
    }
    recoverWith(_defaultValue) {
        return this.value;
    }
    map(fn) {
        return new EitherOk(fn(this.value));
    }
    chain(fn) {
        return fn(this.value);
    }
    mapErr(_fn) {
        return new EitherOk(this.value);
    }
    hasValue(value) {
        return this.value === value;
    }
    isOk() { return true; }
    isErr() { return false; }
    getOkValue() {
        return this.value;
    }
    getErrValue() {
        throw "Can't get an err value from an ok!";
    }
}
class EitherErr {
    constructor(value) {
        this.value = value;
    }
    recoverWith(defaultValue) {
        return defaultValue;
    }
    map(_fn) {
        return new EitherErr(this.value);
    }
    chain(_fn) {
        return new EitherErr(this.value);
    }
    mapErr(fn) {
        return new EitherErr(fn(this.value));
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
    getOkValue() {
        throw "Can't get an ok value from an err!";
    }
    getErrValue() {
        return this.value;
    }
}
function Ok(value) {
    return new EitherOk(value);
}
exports.Ok = Ok;
function Err(value) {
    return new EitherErr(value);
}
exports.Err = Err;
function sequenceList(eithers) {
    const l = eithers.length;
    const out = [];
    for (let i = 0; i < l; i += 1) {
        const e = eithers[i];
        if (e.isErr()) {
            return e;
        }
        out[i] = e.recoverWith(null);
    }
    return Ok(out);
}
exports.sequenceList = sequenceList;
function sequenceObj(eithers) {
    const keys = Object.keys(eithers);
    const vals = Object.values(eithers);
    const l = vals.length;
    const out = [];
    for (let i = 0; i < l; i += 1) {
        const e = vals[i];
        if (e.isErr()) {
            return e;
        }
        out[i] = e.recoverWith(null);
    }
    return Ok(utils_1.zipObj(keys, out));
}
exports.sequenceObj = sequenceObj;
function sequencePromise(eitherPromise) {
    if (eitherPromise.isErr()) {
        return Promise.resolve(eitherPromise);
    }
    return eitherPromise.getOkValue().then(val => Ok(val));
}
exports.sequencePromise = sequencePromise;
function flattenEither(e) {
    return e.isErr() ?
        e :
        e.getOkValue();
}
exports.flattenEither = flattenEither;
