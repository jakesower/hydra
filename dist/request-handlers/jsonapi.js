"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const utils_1 = require("../lib/utils");
const hydra_utils_1 = require("../lib/hydra-utils");
const either_1 = require("../lib/either");
const v4_1 = __importDefault(require("uuid/v4"));
function JsonApiRequestHandler(request, schema) {
    const paramHandlers = {
        include: includeHandler,
    };
    // these variables are useful across the entire request
    const { pathname } = url_1.parse(request.url);
    const rootType = (pathname || '').split('/')[1];
    const result = utils_1.chainPipeThru(either_1.Ok(request), [
        validateRequest,
        validateParams,
        validateSchema,
        buildQuery,
    ]);
    return Promise.resolve(result.isErr() ? hydra_utils_1.errToHydraError(result) : result.getOkValue());
    // Functions
    function validateRequest(request) {
        const chunks = (pathname || '').split('/').splice(1);
        // Group resource requests
        if (chunks.length < 3) {
            return Object.keys(schema.resources).includes(chunks[0])
                ? either_1.Ok(request)
                : either_1.Err({ messages: [`${chunks[0]} is not a valid resource`] });
        }
        return either_1.Err({ messages: ['not implemented'] });
    }
    function validateParams(request) {
        const supportedParams = Object.keys(paramHandlers);
        const { query } = url_1.parse(request.url, true);
        const bad = Object.keys(query).filter(k => !supportedParams.includes(k) && /^[a-z]+$/.test(k));
        return bad.length === 0
            ? either_1.Ok(request)
            : either_1.Err({ messages: bad.map(k => `${k} is not a supported parameter`) });
    }
    function validateSchema(request) {
        return either_1.Ok(request);
    }
    function buildQuery(request) {
        const { pathname, query } = url_1.parse(request.url, true);
        const chunks = (pathname || '').split('/').splice(1);
        const resourceId = chunks[1];
        const baseGraph = Object.assign({ type: rootType, relationships: {} }, (resourceId ? { id: resourceId } : {}));
        return utils_1.chainPipeThru(either_1.Ok(baseGraph), [
            ...Object.keys(query)
                .filter(k => Object.keys(paramHandlers).includes(k))
                .map(k => {
                const handler = paramHandlers[k];
                const paramValue = query[k];
                return graph => handler(graph, paramValue);
            }),
            graph => either_1.Ok({ get: graph }),
        ]);
    }
    function includeHandler(initGraph, paramValue) {
        const relationshipPaths = paramValue.split(',').map(p => p.split('.'));
        const walkToRelated = (resourceType, relationshipPath) => {
            const [relationship, ...rest] = relationshipPath;
            const relData = schema.resources[resourceType].relationships[relationship];
            return {
                [relData.key]: {
                    type: relData.type,
                    cardinality: relData.cardinality,
                    constraints: [],
                    relationships: rest.length === 0 ? {} : walkToRelated(relData.type, rest),
                },
            };
        };
        const relationships = relationshipPaths.reduce((rels, path) => (Object.assign({}, rels, walkToRelated(rootType, path))), {});
        return either_1.Ok(Object.assign({}, initGraph, { relationships }));
    }
    function buildCreateQuery(request) {
        // TODO: walk the graph and error on attributes and/or nested relationships
        const uuid = v4_1.default();
        return buildQuery(request).map(query => (Object.assign({}, query, { type: 'merge' })));
    }
}
exports.JsonApiRequestHandler = JsonApiRequestHandler;
