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
    return { get };
    function get(query) {
        return 'id' in query ? getOne(query) : getMany(query);
    }
    // Relationships are always (?) queried from the context of objects.
    // The formulation is: given object X and relationship type R, what are all Y s.t. the relationship holds
    // Relationships are stored s.t. left is alphabetically first of type then relationship name. Symmetric relationships don't matter for ordering.
    // This hopefully makes inverse queries straightforward.
    // However for performance purposes, it may be useful to store both sides of the relationship. Sync issues are a problem though.
    // Also LOL on you if you're using this store in an arena requiring good performance.
    // Query -> ConcreteGraphWalk? -> GraphNode
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
        return Object.values(utils_1.mapObj(state.objects[query.type], (options, id) => getOne({
            type: query.type,
            id,
            relationships: options.relationships,
        })));
    }
    function expandRelationship(query, relationshipName, options) {
        const { type, id } = query;
        const relationshipDefinition = schema.resources[type].relationships[relationshipName];
        const relationshipType = schema_functions_1.canonicalRelationshipName(schema, type, relationshipName);
        const pool = state.relationships[relationshipType];
        const finder = relArrow => relArrow[type] === id;
        const expand = hit => getOne({
            id: hit[relationshipDefinition.type],
            type: relationshipDefinition.type,
            relationships: options.relationships,
        });
        return relationshipDefinition.cardinality === 'one'
            ? expand(pool.find(finder))
            : pool.filter(finder).map(expand);
    }
}
exports.JsonQuerier = JsonQuerier;
