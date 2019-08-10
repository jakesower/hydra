import ajv from 'ajv';
import { Schema, SchemaAttribute } from '../types';
import { overPath, mapObj, inlineKey, pluckKeys, uniq, reduceObj } from './utils';
import schemaSchema from '../../schema.schema.json';

function schemaErrors(rawSchema) {
  const validate = new ajv().compile(schemaSchema);

  if (validate(rawSchema)) {
    return reduceObj(rawSchema.resources, <string[]>[], (errs, resource: any, resourceName) => [
      ...errs,
      ...reduceObj(resource.relationships, <string[]>[], (rErrs, rel: any, relName) => [
        ...rErrs,
        ...(rel.inverse in rawSchema.resources[rel.type].relationships
          ? []
          : [
              `the "${relName}" relationship on the "${resourceName}" resource does not have a valid inverse`,
            ]),
      ]),
    ]);
  }

  return JSON.stringify(validate.errors);
}

// inlines keys and otherwise makes a schema easier to work with
export function expandSchema(rawSchema): Schema {
  const errors = schemaErrors(rawSchema);
  if (errors.length > 0) {
    throw new Error(JSON.stringify(errors, null, 2));
  }

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

export function relationshipNames(schema: Schema, resourceType: string): string[] {
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

export function canonicalRelationship(
  schema: Schema,
  resourceType: string,
  relationshipName: string
): { name: string; locality: 'local' | 'foreign' } {
  const key = def => `${def.type}/${def.inverse}`;

  const relationshipDef = schema.resources[resourceType].relationships[relationshipName];
  const inverseDef = inverseRelationship(schema, resourceType, relationshipDef.key);

  return key(inverseDef) < key(relationshipDef)
    ? { name: key(inverseDef), locality: 'local' }
    : { name: key(relationshipDef), locality: 'foreign' };
}

export function canonicalRelationshipName(
  schema: Schema,
  resourceType: string,
  relationshipName: string
): string {
  return canonicalRelationship(schema, resourceType, relationshipName).name;
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

export function isSymmetricRelationship(
  schema: Schema,
  resourceType: string,
  relationshipName: string
) {
  const relationshipDef = schema.resources[resourceType].relationships[relationshipName];

  return resourceType === relationshipDef.type && relationshipDef.key === relationshipName;
}
