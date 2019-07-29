"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_functions_1 = require("../lib/schema-functions");
const utils_1 = require("../lib/utils");
function JsonQuerier(schema, baseState) {
    const baseObjects = utils_1.fillObject(schema_functions_1.resourceNames(schema), {});
    const baseRelationships = utils_1.fillObject(schema_functions_1.canonicalRelationshipNames(schema), []);
    let state = {
        objects: utils_1.mergeChildren(baseObjects, baseState.objects),
        relationships: utils_1.mergeChildren(baseRelationships, baseState.relationships),
    };
    return { get, merge };
    function get(query) {
        return 'id' in query ? getOne(query) : getMany(query);
    }
    // As of now, support the same stuff that JSONAPI supports. Namely, only a
    // single object can be touched in a merge call.
    function merge(resource) {
        const { id, type } = resource;
        const base = state.objects[type][id] || {};
        state.objects[type][id] = Object.assign({}, base, resource.attributes);
        utils_1.mapObj(resource.relationships || {}, (relationships, relationshipName) => {
            const symmetric = schema_functions_1.isSymmetricRelationship(schema, type, relationshipName);
            const { name: arrowName, locality } = schema_functions_1.canonicalRelationship(schema, type, relationshipName);
            const relationshipKey = schema_functions_1.canonicalRelationshipName(schema, type, relationshipName);
            const filt = symmetric
                ? arrow => arrow.local === id || arrow.foreign === id
                : locality === 'local'
                    ? arrow => arrow.local === id
                    : arrow => arrow.foreign === id;
            const withoutExisting = state.relationships[relationshipKey].filter(filt);
            const toAdd = (Array.isArray(relationships) ? relationships : [relationships]).map(f => locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id });
            state.relationships[relationshipKey] = [...withoutExisting, ...toAdd];
        });
    }
    function getOne(query) {
        const { type, id } = query;
        const root = state.objects[type][id];
        const relationships = utils_1.mapObj(query.relationships || {}, (options, relationshipName) => expandRelationship(query, relationshipName, options));
        return {
            id,
            type,
            attributes: root,
            relationships,
        };
    }
    function getMany(query) {
        return Object.values(utils_1.mapObj(state.objects[query.type], (_, id) => getOne({
            type: query.type,
            id,
            relationships: query.relationships,
        })));
    }
    function expandRelationship(query, relationshipName, options) {
        const { type, id } = query;
        const relationshipDefinition = schema.resources[type].relationships[relationshipName];
        const relationshipType = schema_functions_1.canonicalRelationshipName(schema, type, relationshipName);
        const pool = state.relationships[relationshipType];
        const inverse = schema_functions_1.inverseRelationship(schema, type, relationshipName);
        // three possibilities: symmetric, local, foreign
        const finder = relationshipDefinition.type === inverse.type
            ? relArrow => relArrow.left === id || relArrow.right === id
            : relArrow => relArrow[type] === id;
        const expand = hit => relationshipDefinition.type === inverse.type
            ? getOne({
                id: hit.left === id ? hit.right : hit.left,
                type: relationshipDefinition.type,
                relationships: options.relationships,
            })
            : getOne({
                id: hit[relationshipDefinition.type],
                type: relationshipDefinition.type,
                relationships: options.relationships,
            });
        if (relationshipDefinition.cardinality === 'one') {
            const found = utils_1.findObj(pool, finder);
            return found ? expand(found) : null;
        }
        return Object.values(utils_1.filterObj(pool, finder)).map(expand);
    }
}
exports.JsonQuerier = JsonQuerier;
