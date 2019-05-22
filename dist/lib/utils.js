"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function appendKeys(base, other) {
    const keys = Object.keys(base);
    let result = {};
    for (let key of keys) {
        result[key] = [...base[key], ...other[key]];
    }
    return result;
}
exports.appendKeys = appendKeys;
function chainPipeThru(val, fns) {
    return fns.reduce((acc, fn) => acc.chain(fn), val);
}
exports.chainPipeThru = chainPipeThru;
function fgo(generator) {
    const recur = ({ value, done }, gen) => {
        if (done) {
            return value;
        }
        return value.chain(v => recur(gen.next(v), gen));
    };
    let g = generator();
    return recur(g.next(), g);
}
exports.fgo = fgo;
// e.g. {a: {inner: 'thing'}, b: {other: 'item'}} => {a: {key: 'a', inner: 'thing'}, b: {key: 'b', other: 'item'}}
function inlineKey(obj) {
    let result = {};
    const keys = Object.keys(obj);
    for (let key of keys) {
        result[key] = Object.assign({}, obj[key], { key });
    }
    return result;
}
exports.inlineKey = inlineKey;
function mapObj(obj, fn) {
    const [keys, vals] = [Object.keys(obj), Object.values(obj)];
    const mappedVals = vals.map((v, idx) => fn(v, keys[idx]));
    return zipObj(keys, mappedVals);
}
exports.mapObj = mapObj;
function maxStable(fn, xs) {
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
exports.maxStable = maxStable;
function mergeAll(items) {
    const init = {};
    return items.reduce((merged, arg) => (Object.assign({}, merged, arg)), init);
}
exports.mergeAll = mergeAll;
function overPath(obj, path, fn) {
    if (path.length === 0) {
        return null;
    }
    const [head, ...tail] = path;
    if (path.length === 1) {
        return Object.assign({}, obj, { [head]: fn(obj[head]) });
    }
    return Object.assign({}, obj, { [head]: overPath(obj[head], tail, fn) });
}
exports.overPath = overPath;
function pipe(fns) {
    return fns.reduce((acc, fn) => val => fn(acc(val)), x => x);
}
exports.pipe = pipe;
function pipeThru(val, fns) {
    return pipe(fns)(val);
}
exports.pipeThru = pipeThru;
function sortBy(fn, xs) {
    if (xs.length === 0) {
        return [];
    }
    const first = xs[0];
    const rest = xs.slice(1);
    let lts = [];
    let gts = [];
    let eqs = [first];
    for (let i = 0; i < rest.length; i += 1) {
        const comp = fn(rest[i], first);
        if (comp > 0) {
            gts.push(rest[i]);
        }
        else if (comp === 0) {
            eqs.push(rest[i]);
        }
        else {
            lts.push(rest[i]);
        }
    }
    return sortBy(fn, lts).concat(eqs).concat(sortBy(fn, gts));
}
exports.sortBy = sortBy;
function uniq(xs) {
    return [...new Set(xs)];
}
exports.uniq = uniq;
function xprod(xs, ys) {
    const xl = xs.length;
    const yl = ys.length;
    let out = [];
    for (let i = 0; i < xl; i += 1) {
        for (let j = 0; j < yl; j += 1) {
            out[out.length] = [xs[i], ys[j]];
        }
    }
    return out;
}
exports.xprod = xprod;
function zipObj(keys, vals) {
    return keys.reduce((out, key, idx) => {
        const o = { [key]: vals[idx] };
        return Object.assign({}, out, o);
    }, {});
}
exports.zipObj = zipObj;
