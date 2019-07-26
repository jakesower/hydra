import { Schema, SchemaAttribute } from '../types';
import { overPath, mapObj, inlineKey, pluckKeys, uniq } from './utils';

// inlines keys and otherwise makes a schema easier to work with
export function expandSchema(rawSchema): Schema {
  return overPath(rawSchema, ['resources'], resources =>
    inlineKey(
      mapObj<any, any>(resources, r => ({
        ...r,
        attributes: inlineKey(r.attributes),
        relationships: inlineKey(r.relationships),
      }))
    )
  ) as Schema;
}

export function resourceNames(schema: Schema): string[] {
  return Object.keys(schema.resources);
}

export function resourceAttributes(
  schema: Schema,
  resourceType: string
): { [k: string]: SchemaAttribute } {
  return schema.resources[resourceType].attributes;
}

export function attributeNames(schema: Schema, resourceType: string): string[] {
  return Object.keys(schema.resources[resourceType].attributes);
}

export function relationshipNames(
  schema: Schema,
  resourceType: string
): string[] {
  return Object.keys(schema.resources[resourceType].relationships);
}

export function extractAttributes(
  schema: Schema,
  resourceType: string,
  obj: { [k: string]: any }
): { [k: string]: any } {
  return pluckKeys(obj, attributeNames(schema, resourceType));
}

export function inverseRelationship(
  schema: Schema,
  resourceType: string,
  relationshipName: string
) {
  const def = schema.resources[resourceType].relationships[relationshipName];
  if (!def) {
    throw { resourceType, relationshipName, schema };
  }
  return schema.resources[def.type].relationships[def.inverse];
}

export function canonicalRelationshipName(
  schema: Schema,
  resourceType: string,
  relationshipName: string
): string {
  const key = def => `${def.type}/${def.inverse}`;

  const relationshipDef =
    schema.resources[resourceType].relationships[relationshipName];
  const inverseDef = inverseRelationship(
    schema,
    resourceType,
    relationshipDef.key
  );

  return key(inverseDef) < key(relationshipDef)
    ? key(inverseDef)
    : key(relationshipDef);
}

export function canonicalRelationshipNames(schema: Schema): string[] {
  return uniq(
    Object.values(schema.resources).reduce(
      (names, resource) =>
        Object.values(resource.relationships).reduce(
          (relNames, rel) => [
            ...relNames,
            canonicalRelationshipName(schema, resource.key, rel.key),
          ],
          names
        ),
      []
    )
  );
}
