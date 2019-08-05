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

export function JsonQuerier(schema, baseState) {
  const baseObjects = fillObject(resourceNames(schema), {});
  const baseRelationships = fillObject(canonicalRelationshipNames(schema), []);

  let state = {
    objects: mergeChildren(baseObjects, baseState.objects || {}),
    relationships: assignChildren([baseRelationships, baseState.relationships || {}]),
  };

  const dispatchMap = {
    get,
    merge,
    delete: delete_,
    appendRelationships,
    replaceRelationship: args => replaceRelationships({ ...args, foreignIds: [args.foreignId] }),
    replaceRelationships,
    deleteRelationship,
    deleteRelationships,
  };

  return function(action) {
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

  function delete_(resource) {
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

  function appendRelationships({ type, id, foreignIds, relationship: relationshipName }) {
    const symmetric = isSymmetricRelationship(schema, type, relationshipName);
    const { name: relationshipKey, locality } = canonicalRelationship(
      schema,
      type,
      relationshipName
    );
    const inverseLocality = locality === 'foreign' ? 'local' : 'foreign';
    const excluder = symmetric
      ? arrow =>
          (arrow.local === id && foreignIds.includes(arrow.foreign)) ||
          (arrow.foreign === id && foreignIds.includes(arrow.local))
      : arrow => arrow[locality] === id && foreignIds.includes(arrow[inverseLocality]);
    const withoutDups = state.relationships[relationshipKey].filter(v => !excluder(v));
    const toAdd = foreignIds.map(f =>
      locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id }
    );

    state.relationships[relationshipKey] = [...withoutDups, ...toAdd];
  }

  function replaceRelationships({ type, id, foreignIds, relationship: relationshipName }) {
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
    const toAdd = foreignIds.map(f =>
      locality === 'local' ? { local: id, foreign: f } : { local: f, foreign: id }
    );

    state.relationships[relationshipKey] = [...withoutExisting, ...toAdd];
  }

  function deleteRelationship({ type, id, relationship: relationshipName }) {
    const symmetric = isSymmetricRelationship(schema, type, relationshipName);
    const { name: relationshipKey, locality } = canonicalRelationship(
      schema,
      type,
      relationshipName
    );

    const filt = symmetric
      ? arrow => arrow.local !== id && arrow.foreign !== id
      : arrow => arrow[locality] !== id;

    const withoutTargeted = state.relationships[relationshipKey].filter(filt);

    state.relationships[relationshipKey] = withoutTargeted;
  }

  function deleteRelationships({ type, id, foreignIds, relationship: relationshipName }) {
    const symmetric = isSymmetricRelationship(schema, type, relationshipName);
    const { name: relationshipKey, locality } = canonicalRelationship(
      schema,
      type,
      relationshipName
    );
    const inverseLocality = locality === 'foreign' ? 'local' : 'foreign';
    const excluder = symmetric
      ? (arrow.local === id && foreignIds.includes(arrow.foreign)) ||
        (arrow.foreign === id && foreignIds.includes(arrow.local))
      : arrow => arrow[locality] === id && foreignIds.includes(arrow[inverseLocality]);
    const withoutTargeted = state.relationships[relationshipKey].filter(v => !excluder(v));

    state.relationships[relationshipKey] = withoutTargeted;
  }

  // Helpers

  function getOne(query) {
    const { type, id } = query;
    const root = state.objects[type][id];

    if (!root) {
      return null;
    }

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

  function getMany(query) {
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
