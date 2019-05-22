import { Schema } from '../types';
import { overPath, mapObj, inlineKey } from "./utils";

// inlines keys and otherwise makes a schema easier to work with
export function expandSchema(rawSchema): Schema {
  return overPath(rawSchema, ['resources'], resources =>
    inlineKey(mapObj<any, any>(resources, r => ({
      ...r,
      attributes: inlineKey(r.attributes),
      relationships: inlineKey(r.relationships),
    }))
  )) as Schema;
}
