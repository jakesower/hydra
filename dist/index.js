"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./lib/utils");
const hydra_utils_1 = require("./lib/hydra-utils");
function hydra(requestHandlers, querier, responders, schema) {
    return (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const responder = selectResponder(responders, req.headers.accept || '');
            if (!responder) {
                return sendResponse({ code: 406, headers: {}, body: '' }, res);
            }
            const requestHandler = selectRequestHandler(requestHandlers, req.headers['content-type'] || '');
            // TODO: let responders handle 415s
            if (!requestHandler) {
                return sendResponse({ code: 415, headers: {}, body: '' }, res);
            }
            const action = yield requestHandler(req, schema);
            const actionResult = yield hydra_utils_1.mapHydraError(action, a => querier(a, schema));
            const response = yield responder(action, actionResult);
            sendResponse(response, res);
        }
        catch (err) {
            console.log(err);
            return sendResponse({ code: 500, headers: {}, body: '' }, res);
        }
    });
}
exports.hydra = hydra;
function sendResponse(response, resHandle) {
    resHandle.statusCode = response.code;
    Object.keys(response.headers).forEach(k => {
        resHandle.setHeader(k, response.headers[k]);
    });
    resHandle.write(response.body);
    resHandle.end();
}
function clean(s) {
    // TODO: Handle quoted parameters: https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4
    return s.replace(/\s/g, '');
}
function acceptTable(rawTypeStr) {
    const [typeStr, ...rawParams] = clean(rawTypeStr).split(';');
    const [type, subType] = typeStr.split('/');
    const params = utils_1.mergeAll(rawParams.map(param => {
        const [k, v] = param.split('=');
        return { [k]: v };
    }));
    return {
        type,
        subType,
        q: Number(params.q || 1),
        params,
    };
}
function matchesType(concreteType, typeDef) {
    const [m, s] = concreteType.split('/');
    return (typeDef.type === '*' ||
        (typeDef.type === m && (typeDef.subType === '*' || typeDef.subType === s)));
}
function parseAccept(acceptString) {
    return acceptString.split(',').map(acceptTable);
}
function selectResponder(responders, acceptString) {
    const parsed = parseAccept(acceptString);
    const pairings = utils_1.xprod(Object.keys(responders), parsed);
    const init = [null, 0];
    const pair = pairings.reduce(([bestType, bestQ], [respType, typeDef]) => typeDef.q > bestQ && matchesType(respType, typeDef)
        ? [respType, typeDef.q]
        : [bestType, bestQ], init);
    return pair[0] !== null ? responders[pair[0]] : null;
}
function selectRequestHandler(requestHandlers, contentType) {
    const handler = Object.keys(requestHandlers).find(k => {
        const [type, subType] = k.split('/');
        return matchesType(contentType, { type, subType });
    });
    return handler ? requestHandlers[handler] : null;
}
