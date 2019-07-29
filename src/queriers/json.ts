import { Schema } from '../types';
import {
  resourceNames,
  canonicalRelationshipNames,
  canonicalRelationship,
  isSymmetricRelationship,
} from '../lib/schema-functions';
import {
  mergeChildren,
  mapObj,
  fillObject,
  filterObj,
  findObj,
  assignChildren,
} from '../lib/utils';

type InternalGraph = {
  objects: { [k: string]: { [k: string]: { [k: string]: any } } }; // type -> id -> attributes
  relationships: { [k: string]: { local: string; foreign: string }[] };
};

interface GraphNode {
  type: string;
  id: string;
  attributes: { [k: string]: any };
  relationships: { [k: string]: GraphNode | GraphNode[] | null };
}

interface QueryOne {
  type: string;
  id: string;
  relationships?: { [k: string]: any };
}

interface QueryMany {
  type: string;
  relationships?: { [k: string]: any };
}

interface Resource {
  type: string;
  id: string;
  attributes: { [k: string]: any };
  relationships?: {
    [k: string]: string | string[];
  };
}

export function JsonQuerier(schema: Schema, baseState: InternalGraph) {
  const baseObjects = fillObject(resourceNames(schema), {});
  const baseRelationships = fillObject(canonicalRelationshipNames(schema), []);

  let state = {
    objects: mergeChildren(baseObjects, baseState.objects),
    relationships: assignChildren([baseRelationships, baseState.relationships]),
  } as InternalGraph;

  return { get, merge, delete: delete_ };

  function get(query: QueryMany): GraphNode[];
  function get(query: QueryOne): GraphNode;
  function get(query: QueryOne | QueryMany): GraphNode | GraphNode[] {
    return 'id' in query ? getOne(query) : getMany(query);
  }

  // As of now, support the same stuff that JSONAPI supports. Namely, only a
  // single object can be touched in a merge call.
  function merge(resource: Resource) {
    const { id, type } = resource;

    const base = state.objects[type][id] || {};

    state.objects[type][id] = { ...base, ...resource.attributes };
    mapObj(resource.relationships || {}, (relationships, relationshipName) => {
      const symmetric = isSymmetricRelationship(schema, type, relationshipName);
      const { name: relationshipKey, locality } = canonicalRelationship(
        schema,
        type,
        relationshipName
      );
      const filt = symmetric
        ? arrow => arrow.local !== id && arrow.foreign !== id
        : arrow => arrow[locality] !== id;
      const withoutExisting = state.relationships[relationshipKey].filter(filt);
      const toAdd = (Array.isArray(relationships) ? relationships : [relationships]).map(f =>
        locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id }
      );

      state.relationships[relationshipKey] = [...withoutExisting, ...toAdd];
    });
  }

  function delete_(resource: Resource) {
    const { id, type } = resource;
    const definition = schema.resources[type];

    delete state.objects[type][id];

    Object.keys(definition.relationships).forEach(relationshipName => {
      const symmetric = isSymmetricRelationship(schema, type, relationshipName);
      const { name: relationshipKey, locality } = canonicalRelationship(
        schema,
        type,
        relationshipName
      );
      const filt = symmetric
        ? arrow => arrow.local !== id && arrow.foreign !== id
        : arrow => arrow[locality] !== id;

      state.relationships[relationshipKey] = state.relationships[relationshipKey].filter(filt);
    });
  }

  function getOne(query: QueryOne): GraphNode {
    const { type, id } = query;
    const root = state.objects[type][id];
    const relationships = mapObj(query.relationships || {}, (options, relationshipName) =>
      expandRelationship(query, relationshipName, options)
    );

    return {
      id,
      type,
      attributes: root,
      relationships,
    };
  }

  function getMany(query: QueryMany): GraphNode[] {
    return Object.values(
      mapObj(state.objects[query.type], (_, id) =>
        getOne({
          type: query.type,
          id,
          relationships: query.relationships,
        })
      )
    );
  }

  function expandRelationship(query, relationshipName, options) {
    const { type, id } = query;
    const relationshipDefinition = schema.resources[type].relationships[relationshipName];
    const { name: relationshipType, locality } = canonicalRelationship(
      schema,
      type,
      relationshipName
    );
    const pool = state.relationships[relationshipType];
    const inverseLocality = locality === 'local' ? 'foreign' : 'local';

    // three possibilities: symmetric, local, foreign
    const finder = isSymmetricRelationship(schema, type, relationshipName)
      ? relArrow => relArrow.local === id || relArrow.foreign === id
      : relArrow => relArrow[locality] === id;

    const expand = hit =>
      isSymmetricRelationship(schema, type, relationshipName)
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
      const found = findObj(pool, finder);
      return found ? expand(found) : null;
    }

    return Object.values(filterObj(pool, finder)).map(expand);
  }
}
