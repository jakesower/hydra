import { parse as parseUrl } from 'url';
import { chainPipeThru } from '../lib/utils';
import { errToHydraError } from '../lib/hydra-utils';
import { Ok, Err } from '../lib/either';
import { default as uuidV4 } from 'uuid/v4';

/*
  possible params:

  - fields (dogmatic)
  - sort (dogmatic)
  - page (dogmatic)
  - filter (loose)

  other stuff:

  - relationship urls
  - unrecognized params without a non a-z character must return 400

  assumptions that should be configs:

  - IDs created on client side
*/

export function JsonApiRequestHandler({ request, schema, querier }) {
  const paramHandlers = {
    include: includeHandler,
  };

  // these variables are useful across the entire request
  const { pathname } = parseUrl(request.url);
  const rootType = (pathname || '').split('/')[1];

  const result = chainPipeThru(Ok(request), [
    validateRequest,
    validateParams,
    validateSchema,
    buildQuery,
  ]);

  return Promise.resolve(result.isErr() ? errToHydraError(result) : result.getOkValue());

  // Functions

  function validateRequest(request) {
    const chunks = (pathname || '').split('/').splice(1);

    // Group resource requests
    if (chunks.length < 3) {
      return Object.keys(schema.resources).includes(chunks[0])
        ? Ok(request)
        : Err({ messages: [`${chunks[0]} is not a valid resource`] });
    }

    return Err({ messages: ['not implemented'] });
  }

  function validateParams(request) {
    const supportedParams = Object.keys(paramHandlers);
    const { query } = parseUrl(request.url, true);
    const bad = Object.keys(query).filter(k => !supportedParams.includes(k) && /^[a-z]+$/.test(k));

    return bad.length === 0
      ? Ok(request)
      : Err({ messages: bad.map(k => `${k} is not a supported parameter`) });
  }

  function validateSchema(request) {
    return Ok(request);
  }

  /**
   * GET requests
   *
   * Per spec, three types must be supported:
   * GET /articles
   * GET /articles/1
   * GET /articles/1/author
   *
   * The first two cases are straightforward in light of the query format, however the third form requires
   *
   * BIG QUESTION -- Should request-handlers receive a querier as an argument? It allows any kind of
   * queries to be understood and handled, but is much more coupled, except from a DI POV.
   *
   * ANSWER - Yes. It's impossible to implement request handlers otherwise. Queriers appear to be the
   * most interesting part of the project.
   *
   */
  function buildQuery(request) {
    const { pathname, query } = parseUrl(request.url, true);
    const chunks = (pathname || '').split('/').splice(1);
    const resourceId = chunks[1];

    const baseGraph = {
      type: rootType,
      relationships: {},
      ...(resourceId ? { id: resourceId } : {}),
    };

    return chainPipeThru(Ok(baseGraph), [
      ...Object.keys(query)
        .filter(k => Object.keys(paramHandlers).includes(k))
        .map(k => {
          const handler = paramHandlers[k];
          const paramValue = query[k];

          return graph => handler(graph, paramValue);
        }),
      graph => Ok({ get: graph }),
    ]);
  }

  function includeHandler(initGraph, paramValue) {
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

    return Ok({ ...initGraph, relationships });
  }

  function buildCreateQuery(request) {
    // TODO: walk the graph and error on attributes and/or nested relationships
    const uuid = uuidV4();

    return buildQuery(request).map(query => ({
      ...query,
      type: 'merge',
    }));
  }
}
