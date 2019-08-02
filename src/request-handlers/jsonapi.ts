import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { HydraError, Schema, Action, Query } from '../types';
import { chainPipeThru } from '../lib/utils';
import { errToHydraError } from '../lib/hydra-utils';
import { Either, Ok, Err } from '../lib/either';
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

interface EitherHydraError {
  messages: string[];
  code?: string;
  meta?: any;
}

export function JsonApiRequestHandler(
  request: IncomingMessage,
  schema: Schema
): Promise<HydraError | Action> {
  const paramHandlers = {
    include: includeHandler,
  };

  // these variables are useful across the entire request
  const { pathname } = parseUrl(request.url as string);
  const rootType = (pathname || '').split('/')[1];

  const result = chainPipeThru(Ok(request), [
    validateRequest,
    validateParams,
    validateSchema,
    buildQuery,
  ]);

  return Promise.resolve(result.isErr() ? errToHydraError(result) : result.getOkValue());

  // Functions

  function validateRequest(request: IncomingMessage): Either<EitherHydraError, IncomingMessage> {
    const chunks = (pathname || '').split('/').splice(1);

    // Group resource requests
    if (chunks.length < 3) {
      return Object.keys(schema.resources).includes(chunks[0])
        ? Ok(request)
        : Err({ messages: [`${chunks[0]} is not a valid resource`] });
    }

    return Err({ messages: ['not implemented'] });
  }

  function validateParams(request: IncomingMessage): Either<EitherHydraError, IncomingMessage> {
    const supportedParams = Object.keys(paramHandlers);
    const { query } = parseUrl(request.url as string, true);
    const bad = Object.keys(query).filter(k => !supportedParams.includes(k) && /^[a-z]+$/.test(k));

    return bad.length === 0
      ? Ok(request)
      : Err({ messages: bad.map(k => `${k} is not a supported parameter`) });
  }

  function validateSchema(request: IncomingMessage): Either<EitherHydraError, IncomingMessage> {
    return Ok(request);
  }

  function buildQuery(request: IncomingMessage): Either<HydraError, Action> {
    const { pathname, query } = parseUrl(request.url as string, true);
    const chunks = (pathname || '').split('/').splice(1);
    const resourceId = chunks[1];

    const baseGraph: Query = {
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

  function includeHandler(initGraph: Query, paramValue: string): Either<HydraError, Query> {
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

  function buildCreateQuery(request: IncomingMessage): Either<EitherHydraError, Action> {
    // TODO: walk the graph and error on attributes and/or nested relationships
    const uuid = uuidV4();

    return buildQuery(request).map(query => ({
      ...query,
      type: 'merge',
    }));
  }
}
