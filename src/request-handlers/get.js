import { mapResult, pick, sortWithAll, sortByAll, cmp } from '../lib/utils';
import { finalizablePipe } from '../lib/finalizable-pipe';
import { tag } from '../lib/element-tags';

/*
  possible params:

  - fields (dogmatic)
  - sort (dogmatic)
  - page (dogmatic)
  - filter (loose)

  Three resource forms:

  - /things
  - /things/1
  - /things/1/widget

  One relationship form:

  - /things/1/relationships/widget

  THESE REPRESENT A COMPLETE SET OF LEGIT URL PATTERNS

  Concerns (for resource forms):

  - A proper root for the result tree must be selected
  - All query params must be taken into consideration
  - Queries of the third form must be properly handled, specifically:
    - The root resource must be properly returned
    - If the origin resource doesn't exist, an error must be returned
    - Queries must be minimized

  TERMINOLOGY

  - The root requested resource is referred to as the "rootResource"
  - If requesting a resource related to the rootResource, it's called the "relatedResource"

  - So note references to "root" and "related"
*/

export async function get({ requestQuery, querier, pathChunks, schema }) {
  const [rootType, resourceId, relOrLink, rel] = pathChunks;

  switch (pathChunks.length) {
    case 1:
    case 2:
      return basic(rootType, resourceId);
    case 3:
      return related(rootType, resourceId, relOrLink);
    case 4:
      return relationship(rootType, resourceId, rel);
    default:
      return tag('error', 'Bad URL format');
  }

  // helpers

  async function basic(rootType, resourceId) {
    const baseGraph = {
      type: rootType,
      relationships: {},
      ...(resourceId ? { id: resourceId } : {}),
    };

    const stack = [
      // middlewares pertaining to query params
      ...paramStack({ schema, rootType, requestQuery }),
      // the query runner itself
      function*(query) {
        return querier({ get: query });
      },
    ];

    const result = await finalizablePipe(stack)(baseGraph);

    return tag('query-result', { rootType, result });
  }

  async function related(rootType, rootResourceId, relationshipName) {
    const relationshipDefinition = schema.resources[rootType].relationships[relationshipName];

    const relatedGraph = {
      type: relationshipDefinition.type,
      cardinality: relationshipDefinition.cardinality,
      constraints: [],
      relationships: {},
    };

    const wrapMw = async function*(relatedQuery, _next, finalize) {
      const query = {
        type: rootType,
        relationships: { [relationshipName]: relatedQuery },
        id: rootResourceId,
      };

      const result = await querier({ get: query });

      if (result === null) {
        return finalize(tag('error', { code: 404, messages: ['root resource does not exist'] }));
      }

      return tag('query-result', {
        rootType: relationshipDefinition.type,
        result: result.relationships[relationshipName],
      });
    };

    const paramMws = paramStack({ schema, rootType: relationshipDefinition.type, requestQuery });

    return finalizablePipe([...paramMws, wrapMw])(relatedGraph);
  }

  async function relationship(rootType, rootResourceId, relationshipName) {
    const query = {
      type: rootType,
      relationships: { [relationshipName]: {} },
      id: rootResourceId,
    };

    const result = await querier({ get: query });

    return {
      relationship: { rootType, result },
    };
  }
}

// note that this is order sensitive
const handlerMiddlewares = {
  include: includeHandler,
  fields: fieldsHandler,
  sort: sortHandler,
};

// this function figures out which query parameters have been passed as part of
// the request and creates appropriate middleware for those that exist.
// the goal is that middleware can be added in the handlerMiddlewares object
// and be properly applied
function paramStack({ requestQuery, schema, rootType }) {
  return Object.keys(requestQuery)
    .filter(k => Object.keys(handlerMiddlewares).includes(k))
    .map(k => {
      const handler = handlerMiddlewares[k];
      const paramValue = requestQuery[k];

      return handler({ schema, rootType, paramValue });
    });
}

function includeHandler({ schema, rootType, paramValue }) {
  return async function*(graph, next) {
    const relationshipPaths = paramValue.split(',').map(p => p.split('.'));

    const walkToRelated = (resourceType, relationshipPath) => {
      const [relationship, ...rest] = relationshipPath;
      const relData = schema.resources[resourceType].relationships[relationship];

      return {
        [relData.key]: {
          type: relData.type,
          cardinality: relData.cardinality,
          constraints: [],
          relationships: rest.length === 0 ? {} : walkToRelated(relData.type, rest),
        },
      };
    };

    const relationships = relationshipPaths.reduce(
      (rels, path) => ({
        ...rels,
        ...walkToRelated(rootType, path),
      }),
      {}
    );

    return yield next({ ...graph, relationships });
  };
}

// TODO: A hint passing mechanism for perf would be nice
function fieldsHandler({ paramValue }) {
  const id = x => x;
  const typeFilter = Object.keys(paramValue).reduce((filters, name) => {
    return { ...filters, [name]: attrs => pick(attrs, paramValue[name].split(',')) };
  }, {});

  return function*(graph, next) {
    const result = yield next(graph);

    return mapResult(result, resource => ({
      ...resource,
      attributes: (typeFilter[resource.type] || id)(resource.attributes),
    }));
  };
}

// Only sortable on the base resource
function sortHandler({ paramValue }) {
  const fields = paramValue.split(',');
  const fns = fields.map(field => {
    const restProp = field.slice(1);
    return field[0] === '-'
      ? (a, b) => cmp(b.attributes[restProp], a.attributes[restProp])
      : (a, b) => cmp(a.attributes[field], b.attributes[field]);
  });

  return function*(graph, next) {
    const result = yield next(graph);

    return sortByAll(fns, result);
  };
}
