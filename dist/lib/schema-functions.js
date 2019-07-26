"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// inlines keys and otherwise makes a schema easier to work with
function expandSchema(rawSchema) {
    return utils_1.overPath(rawSchema, ['resources'], resources => utils_1.inlineKey(utils_1.mapObj(resources, r => (Object.assign({}, r, { attributes: utils_1.inlineKey(r.attributes), relationships: utils_1.inlineKey(r.relationships) })))));
}
exports.expandSchema = expandSchema;
function resourceNames(schema) {
    return Object.keys(schema.resources);
}
exports.resourceNames = resourceNames;
function resourceAttributes(schema, resourceType) {
    return schema.resources[resourceType].attributes;
}
exports.resourceAttributes = resourceAttributes;
function attributeNames(schema, resourceType) {
    return Object.keys(schema.resources[resourceType].attributes);
}
exports.attributeNames = attributeNames;
function relationshipNames(schema, resourceType) {
    return Object.keys(schema.resources[resourceType].relationships);
}
exports.relationshipNames = relationshipNames;
function extractAttributes(schema, resourceType, obj) {
    return utils_1.pluckKeys(obj, attributeNames(schema, resourceType));
}
exports.extractAttributes = extractAttributes;
function inverseRelationship(schema, resourceType, relationshipName) {
    const def = schema.resources[resourceType].relationships[relationshipName];
    if (!def) {
        throw { resourceType, relationshipName, schema };
    }
    return schema.resources[def.type].relationships[def.inverse];
}
exports.inverseRelationship = inverseRelationship;
function canonicalRelationshipName(schema, resourceType, relationshipName) {
    const key = def => `${def.type}/${def.key}`;
    const relationshipDef = schema.resources[resourceType].relationships[relationshipName];
    const inverseDef = inverseRelationship(schema, resourceType, relationshipDef.key);
    return key(inverseDef) < key(relationshipDef)
        ? key(inverseDef)
        : key(relationshipDef);
}
exports.canonicalRelationshipName = canonicalRelationshipName;
function canonicalRelationshipNames(schema) {
    return utils_1.uniq(Object.values(schema.resources).reduce((names, resource) => Object.values(resource.relationships).reduce((relNames, rel) => [
        ...relNames,
        canonicalRelationshipName(schema, resource.key, rel.key),
    ], names), []));
}
exports.canonicalRelationshipNames = canonicalRelationshipNames;
