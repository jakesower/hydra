// import { IncomingMessage } from "http";
// import { parse as parseUrl } from 'url';
// import { HydraError, Schema, QueryGraph } from "../types";
// import { chainPipeThru } from "../lib/utils";
// import { Either, Ok, Err } from "../lib/either";
// import { default as uuidV4 } from 'uuid/v4';

// /*
//   possible params:

//   - fields (dogmatic)
//   - sort (dogmatic)
//   - page (dogmatic)
//   - filter (loose)

//   other stuff:

//   - relationship urls
//   - unrecognized params without a non a-z character must return 400

//   assumptions that should be configs:

//   - IDs created on client side
// */

// export function JsonApiRequestHandler(request: IncomingMessage, schema: Schema): Promise<Either<HydraError, QueryGraph>> {
//   const paramHandlers = {
//     include: includeHandler,
//   };

//   // these variables are useful across the entire request
//   const { pathname } = parseUrl(request.url as string);
//   const rootType = (pathname || '').split('/')[1];

//   return Promise.resolve(chainPipeThru(Ok(request), [
//     validateRequest,
//     validateParams,
//     validateSchema,
//     buildQuery
//   ]));


//   function validateRequest(request: IncomingMessage): Either<HydraError, IncomingMessage> {
//     const chunks = (pathname || '').split('/').splice(1);

//     // Group resource requests
//     if (chunks.length < 3) {
//       return Object.keys(schema.resources).includes(chunks[0]) ?
//         Ok(request) :
//         Err({ messages: [`${chunks[0]} is not a valid resource`] });
//     }

//     return Err({ messages: ['not implemented'] });
//   }


//   function validateParams(request: IncomingMessage): Either<HydraError, IncomingMessage> {
//     const supportedParams = Object.keys(paramHandlers);
//     const { query } = parseUrl(request.url as string, true);
//     const bad = Object.keys(query).filter(k => !supportedParams.includes(k) && /^[a-z]+$/.test(k));

//     return bad.length === 0 ?
//       Ok(request) :
//       Err({ messages: bad.map(k => `${k} is not a supported parameter`) });
//   }


//   function validateSchema(request: IncomingMessage): Either<HydraError, IncomingMessage> {
//     return Ok(request);
//   }


//   function buildQuery(request: IncomingMessage): Either<HydraError, QueryGraph> {
//     const { pathname, query } = parseUrl(request.url as string, true);
//     const chunks = (pathname || '').split('/').splice(1);
//     const resourceId = chunks[1];

//     const baseGraph: QueryGraph = {
//       action: 'query',
//       cardinality: resourceId ? 'one' : 'many',
//       type: rootType,
//       constraints: resourceId ? [{ type: 'equal', field: 'id', value: resourceId }] : [],
//       relationships: {}
//     };

//     return chainPipeThru(
//       Ok(baseGraph),
//       Object.keys(query).filter(k => Object.keys(paramHandlers).includes(k)).map(k => {
//         const handler = paramHandlers[k];
//         const paramValue = query[k];

//         return graph => handler(graph, paramValue);
//       }),
//     );
//   }


//   function includeHandler(initGraph: QueryGraph, paramValue: string): Either<HydraError, QueryGraph> {
//     const relationshipPaths = paramValue
//       .split(',')
//       .map(p => p.split('.'));

//     const walkToRelated = (resourceType, relationshipPath) => {
//       const [relationship, ...rest] = relationshipPath;
//       const relData = schema.resources[resourceType].relationships[relationship];

//       return {
//         [relData.key]: {
//           type: relData.type,
//           cardinality: relData.cardinality,
//           constraints: [],
//           relationships: (rest.length === 0) ? {} : walkToRelated(relData.type, rest),
//         }
//       };
//     }

//     const relationships = relationshipPaths.reduce((rels, path) => ({
//       ...rels,
//       ...walkToRelated(rootType, path),
//     }), {});

//     return Ok({ ...initGraph, relationships });
//   }


//   function buildCreateQuery(request: IncomingMessage): Either<HydraError, QueryGraph> {
//     // TODO: walk the graph and error on attributes and/or nested relationships
//     const uuid = uuidV4();

//     return buildQuery(request).map(query => ({
//       ...query,
//       type: 'merge',
//     }));
//   }
// }
