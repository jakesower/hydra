import { pluckKeys, omitKeys, mapObj, unnest } from '../lib/utils';

export function JsonApiResponder(schema) {
  return function({ action, rootType, result }) {
    const dispatchMap = {
      get,
      error: handleError,
    };

    console.log({ action, dispatchMap, rootType, result });

    const details = dispatchMap[action](result);
    const meta = {
      description: 'why hello there',
    };

    const headers = {
      'Content-Type': 'application/vnd.api+json',
    };

    return Promise.resolve({
      code: details.code,
      headers,
      body: JSON.stringify({
        meta,
        ...details.payload,
      }),
    });

    // Functions

    function handleError(errors) {
      return {
        code: 400,
        payload: {
          errors: errors.messages.map(err => ({ detail: err })),
        },
      };
    }

    function get(resultGraph) {
      function compressGraph(map, node) {
        const { id, type, attributes } = node;
        const def = schema.resources[type];
        const relationships = pluckKeys(node.relationships, Object.keys(def.relationships));
        const pluckPair = n => pluckKeys(n, ['id', 'type']);
        const relToPairs = rel =>
          rel ? (Array.isArray(rel) ? rel.map(pluckPair) : pluckPair(rel)) : null;

        const next = {
          ...map,
          [type]: {
            ...(map[type] || {}),
            [id]: {
              type,
              id,
              attributes: pluckKeys(attributes, Object.keys(def.attributes)),
              relationships: mapObj(relationships, relToPairs),
            },
          },
        };

        const relNodes = unnest(
          Object.values(relationships)
            .filter(n => n !== null)
            .map(n => (Array.isArray(n) ? n : [n]))
        );

        return relNodes.reduce(compressGraph, next);
      }

      if (resultGraph === null) {
        return { code: 200, payload: { data: null } };
      }

      const allData = Array.isArray(resultGraph)
        ? resultGraph.reduce(compressGraph, {})
        : compressGraph({}, resultGraph);

      const roots = Array.isArray(resultGraph) ? resultGraph : [resultGraph];
      const data = Object.values(pluckKeys(allData[rootType] || {}, roots.map(r => r.id)));
      const allIncluded = {
        ...allData,
        [rootType]: omitKeys(allData[rootType] || {}, roots.map(r => r.id)),
      };
      const included = unnest(Object.values(allIncluded).map(Object.values));

      return {
        code: 200,
        payload: {
          data,
          ...(included.length > 0 ? { included } : {}),
        },
      };
    }
  };
}
