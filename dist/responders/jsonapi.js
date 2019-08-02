"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../lib/utils");
function JsonApiResponder(schema) {
    return function (action, actionResult) {
        const details = 'hydraError' in actionResult
            ? handleError(actionResult)
            : 'get' in actionResult
                ? handleGet(actionResult.get)
                : { code: 500, payload: { meta: ';(' } };
        const meta = {
            description: 'why hello there',
        };
        const headers = {
            'Content-Type': 'application/vnd.api+json',
        };
        return Promise.resolve({
            code: details.code,
            headers,
            body: JSON.stringify(Object.assign({ meta }, details.payload)),
        });
        function handleError(errors) {
            return {
                code: 400,
                payload: {
                    errors: errors.messages.map(err => ({ detail: err })),
                },
            };
        }
        function handleGet(resultGraph) {
            function compressGraph(map, node) {
                const { id, type, attributes } = node;
                const def = schema.resources[type];
                const relationships = utils_1.pluckKeys(node.relationships, Object.keys(def.relationships));
                const pluckPair = n => utils_1.pluckKeys(n, ['id', 'type']);
                const relToPairs = rel => rel ? (Array.isArray(rel) ? rel.map(pluckPair) : pluckPair(rel)) : null;
                const next = Object.assign({}, map, { [type]: Object.assign({}, (map[type] || {}), { [id]: {
                            type,
                            id,
                            attributes: utils_1.pluckKeys(attributes, Object.keys(def.attributes)),
                            relationships: utils_1.mapObj(relationships, relToPairs),
                        } }) });
                const relNodes = utils_1.unnest(Object.values(relationships)
                    .filter(n => n !== null)
                    .map(n => (Array.isArray(n) ? n : [n])));
                return relNodes.reduce(compressGraph, next);
            }
            if (resultGraph === null) {
                return { code: 200, payload: { data: null } };
            }
            const allData = Array.isArray(resultGraph)
                ? resultGraph.reduce(compressGraph, {})
                : compressGraph({}, resultGraph);
            const roots = Array.isArray(resultGraph) ? resultGraph : [resultGraph];
            const rootType = action.get.type;
            const data = Object.values(utils_1.pluckKeys(allData[rootType] || {}, roots.map(r => r.id)));
            const allIncluded = Object.assign({}, allData, { [rootType]: utils_1.omitKeys(allData[rootType] || {}, roots.map(r => r.id)) });
            const included = utils_1.unnest(Object.values(allIncluded).map(Object.values));
            return {
                code: 200,
                payload: Object.assign({ data }, (included.length > 0 ? { included } : {})),
            };
        }
    };
}
exports.JsonApiResponder = JsonApiResponder;
