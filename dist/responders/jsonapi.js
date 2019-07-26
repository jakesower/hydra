"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../lib/utils");
function JsonApiResponder(results, schema) {
    const details = results.split(handleError, handleOk);
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
    function handleOk(resultGraph) {
        const formatResource = (type, id) => {
            const resource = resultGraph.resources[type][id];
            const def = schema.resources[type];
            return {
                type,
                id,
                attributes: utils_1.pluckKeys(resource, Object.keys(def.attributes)),
                relationships: utils_1.pluckKeys(resource, Object.keys(def.relationships)),
            };
        };
        const expandRoot = id => formatResource(resultGraph.type, id);
        const data = resultGraph.cardinality === 'one'
            ? expandRoot(resultGraph.root)
            : resultGraph.root.map(expandRoot);
        const rootIds = resultGraph.cardinality === 'one' ? [resultGraph.root] : resultGraph.root;
        const includedResources = Object.assign({}, resultGraph.resources, { [resultGraph.type]: utils_1.omitKeys(resultGraph.resources[resultGraph.type], rootIds) });
        const included = utils_1.reduceObj(includedResources, [], (acc, resourcesOfType, type) => [
            ...acc,
            ...Object.keys(resourcesOfType).map(id => formatResource(type, id)),
        ]);
        return {
            code: 200,
            payload: {
                data,
                included,
            },
        };
    }
}
exports.JsonApiResponder = JsonApiResponder;
