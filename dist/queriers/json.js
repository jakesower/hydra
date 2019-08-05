"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_functions_1 = require("../lib/schema-functions");
const utils_1 = require("../lib/utils");
function JsonQuerier(schema, baseState) {
    const baseObjects = utils_1.fillObject(schema_functions_1.resourceNames(schema), {});
    const baseRelationships = utils_1.fillObject(schema_functions_1.canonicalRelationshipNames(schema), []);
    let state = {
        objects: utils_1.mergeChildren(baseObjects, baseState.objects || {}),
        relationships: utils_1.assignChildren([baseRelationships, baseState.relationships || {}]),
    };
    const dispatchMap = {
        get,
        merge,
        delete: delete_,
        appendRelationship,
        replaceRelationship,
        replaceRelationships: replaceRelationship,
        deleteRelationship,
    };
    return function (action) {
        const actionKey = Object.keys(dispatchMap).find(k => k in action);
        if (!actionKey) {
            return Promise.reject('unrecognized action!');
        }
        return Promise.resolve(dispatchMap[actionKey](action[actionKey]));
    };
    // Main actions
    function get(query) {
        return 'id' in query ? getOne(query) : getMany(query);
    }
    // As of now, support the same stuff that JSONAPI supports. Namely, only a
    // single object can be touched in a merge call. This should be revisited.
    function merge(resource) {
        const { id, type } = resource;
        const base = state.objects[type][id] || {};
        state.objects[type][id] = Object.assign({}, base, resource.attributes);
        utils_1.mapObj(resource.relationships || {}, (relationships, relationshipName) => {
            const symmetric = schema_functions_1.isSymmetricRelationship(schema, type, relationshipName);
            const { name: relationshipKey, locality } = schema_functions_1.canonicalRelationship(schema, type, relationshipName);
            const filt = symmetric
                ? arrow => arrow.local !== id && arrow.foreign !== id
                : arrow => arrow[locality] !== id;
            const withoutExisting = state.relationships[relationshipKey].filter(filt);
            const toAdd = (Array.isArray(relationships) ? relationships : [relationships]).map(f => locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id });
            state.relationships[relationshipKey] = [...withoutExisting, ...toAdd];
        });
    }
    function delete_(resource) {
        const { id, type } = resource;
        const definition = schema.resources[type];
        delete state.objects[type][id];
        Object.keys(definition.relationships).forEach(relationshipName => {
            const symmetric = schema_functions_1.isSymmetricRelationship(schema, type, relationshipName);
            const { name: relationshipKey, locality } = schema_functions_1.canonicalRelationship(schema, type, relationshipName);
            const filt = symmetric
                ? arrow => arrow.local !== id && arrow.foreign !== id
                : arrow => arrow[locality] !== id;
            state.relationships[relationshipKey] = state.relationships[relationshipKey].filter(filt);
        });
    }
    function appendRelationship() {
        const symmetric = schema_functions_1.isSymmetricRelationship(schema, type, relationshipName);
        const { name: relationshipKey, locality } = schema_functions_1.canonicalRelationship(schema, type, relationshipName);
        const filt = symmetric
            ? arrow => arrow.local !== id && arrow.foreign !== id
            : arrow => arrow[locality] !== id;
        const withoutExisting = state.relationships[relationshipKey].filter(filt);
        const toAdd = (Array.isArray(foreignId) ? foreignId : [foreignId]).map(f => locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id });
        state.relationships[relationshipKey] = [...withoutExisting, ...toAdd];
    }
    function replaceRelationship({ type, id, foreignId, relationship: relationshipName }) {
        const symmetric = schema_functions_1.isSymmetricRelationship(schema, type, relationshipName);
        const { name: relationshipKey, locality } = schema_functions_1.canonicalRelationship(schema, type, relationshipName);
        const filt = symmetric
            ? arrow => arrow.local !== id && arrow.foreign !== id
            : arrow => arrow[locality] !== id;
        const withoutExisting = state.relationships[relationshipKey].filter(filt);
        const toAdd = (Array.isArray(foreignId) ? foreignId : [foreignId]).map(f => locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id });
        state.relationships[relationshipKey] = [...withoutExisting, ...toAdd];
    }
    function deleteRelationship() { }
    // Helpers
    function getOne(query) {
        const { type, id } = query;
        const root = state.objects[type][id];
        if (!root) {
            return null;
        }
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
        const { name: relationshipType, locality } = schema_functions_1.canonicalRelationship(schema, type, relationshipName);
        const pool = state.relationships[relationshipType];
        const inverseLocality = locality === 'local' ? 'foreign' : 'local';
        // three possibilities: symmetric, local, foreign
        const finder = schema_functions_1.isSymmetricRelationship(schema, type, relationshipName)
            ? relArrow => relArrow.local === id || relArrow.foreign === id
            : relArrow => relArrow[locality] === id;
        const expand = hit => schema_functions_1.isSymmetricRelationship(schema, type, relationshipName)
            ? getOne({
                id: hit.local === id ? hit.foreign : hit.local,
                type: relationshipDefinition.type,
                relationships: options.relationships,
            })
            : getOne({
                id: hit[inverseLocality],
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
