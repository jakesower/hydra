import { Schema } from '../types';
import {
  resourceNames,
  canonicalRelationshipNames,
  canonicalRelationshipName,
  inverseRelationship,
} from '../lib/schema-functions';
import {
  mergeChildren,
  mapObj,
  fillObject,
  filterObj,
  findObj,
} from '../lib/utils';

type InternalGraph = {
  objects: { [k: string]: { [k: string]: { [k: string]: any } } }; // type -> id -> attributes
  relationships: { [k: string]: { [k: string]: string }[] };
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

export function JsonQuerier(schema: Schema, baseState: InternalGraph) {
  const baseObjects = fillObject(resourceNames(schema), {});
  const baseRelationships = fillObject(canonicalRelationshipNames(schema), []);

  let state = {
    objects: mergeChildren(baseObjects, baseState.objects),
    relationships: mergeChildren(baseRelationships, baseState.relationships),
  } as InternalGraph;

  return { get };

  function get(query: QueryMany): GraphNode[];
  function get(query: QueryOne): GraphNode;
  function get(query: QueryOne | QueryMany): GraphNode | GraphNode[] {
    return 'id' in query ? getOne(query) : getMany(query);
  }

  // Relationships are always (?) queried from the context of objects.
  // The formulation is: given object X and relationship type R, what are all Y s.t. the relationship holds
  // Relationships are stored s.t. left is alphabetically first of type then relationship name. Symmetric relationships don't matter for ordering.
  // This hopefully makes inverse queries straightforward.
  // However for performance purposes, it may be useful to store both sides of the relationship. Sync issues are a problem though.
  // Also LOL on you if you're using this store in an arena requiring good performance.

  // Query -> ConcreteGraphWalk? -> GraphNode
  function getOne(query: QueryOne): GraphNode {
    const { type, id } = query;
    const root = state.objects[type][id];
    const relationships = mapObj(
      query.relationships || {},
      (options, relationshipName) =>
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
    const relationshipDefinition =
      schema.resources[type].relationships[relationshipName];
    const relationshipType = canonicalRelationshipName(
      schema,
      type,
      relationshipName
    );
    const pool = state.relationships[relationshipType];
    const inverse = inverseRelationship(schema, type, relationshipName);

    const finder =
      relationshipDefinition.type === inverse.type
        ? relArrow => relArrow.left === id || relArrow.right === id
        : relArrow => relArrow[type] === id;

    const expand = hit =>
      relationshipDefinition.type === inverse.type
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
      const found = findObj(pool, finder);
      return found ? expand(found) : null;
    }

    return Object.values(filterObj(pool, finder)).map(expand);
  }
}
