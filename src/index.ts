import { RequestHandler, Querier, Responder, HydraError, QueryGraph, HydraResponse, Schema } from './types';
import { IncomingMessage, ServerResponse } from 'http';
import { xprod, mergeAll } from './lib/utils';
import { sequencePromise, Either, flattenEither } from './lib/either';

interface TypeMatcher {
  type: string,
  subType: string,
  q: number,
  params: { [k: string]: string },
};

type QuerierInput = Either<HydraError, QueryGraph>;

export function hydra(
  requestHandlers: { [k: string]: RequestHandler },
  querier: Querier,
  responders: { [k: string]: Responder },
  schema: Schema,
){
  return (req: IncomingMessage, res: ServerResponse) => {
    try {
      const responder = selectResponder(responders, req.headers.accept || '');

      if (!responder) {
        return sendResponse({ code: 406, headers: {}, body: '' }, res);
      }

      const requestHandler = selectRequestHandler(requestHandlers, req.headers["content-type"] || '');

      // TODO: let responders handle 415s
      if (!requestHandler) {
        return sendResponse({ code: 415, headers: {}, body: '' }, res);
      }

      return requestHandler(req, schema)
        .then((query: QuerierInput) => {
          const sequenced = sequencePromise(query.map(q => querier(q, schema)));
          return sequenced.then(flattenEither);
        })
        .then(r => responder(r, schema))
        .then(outcome => sendResponse(outcome, res))
        .catch(err => {
          console.error(err);
          sendResponse({ code: 500, headers: {}, body: '' }, res);
        });

    } catch (err) {
      return sendResponse({ code: 500, headers: {}, body: '' }, res);
    }
  };
}


function sendResponse(response: HydraResponse, resHandle: ServerResponse) {
  resHandle.statusCode = response.code;
  Object.keys(response.headers).forEach(k => {
    resHandle.setHeader(k, response.headers[k]);
  });
  resHandle.write(response.body);
  resHandle.end();
}


function clean(s: string): string {
  // TODO: Handle quoted parameters: https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4
  return s.replace(/\s/g, '');
}

function acceptTable(rawTypeStr: string): TypeMatcher {
  const [typeStr, ...rawParams] = clean(rawTypeStr).split(';');
  const [type, subType] = typeStr.split('/');
  const params = mergeAll(rawParams.map(param => {
    const [k, v] = param.split('=');
    return { [k]: v };
  }));

  return {
    type,
    subType,
    q: Number(params.q || 1),
    params,
  };
}


function matchesType(concreteType, typeDef) {
  const [m, s] = concreteType.split('/');
  return (typeDef.type === '*') || (typeDef.type === m && (typeDef.subType === '*' || typeDef.subType === s));
}


function parseAccept(acceptString: string): TypeMatcher[] {
  return acceptString.split(',').map(acceptTable);
}


function selectResponder(responders: { [k: string]: Responder }, acceptString: string): Responder | null {
  const parsed = parseAccept(acceptString);
  const pairings = xprod(Object.keys(responders), parsed);

  const init: [string | null, number] = [null, 0];
  const pair: [string | null, number] = pairings.reduce(
    ([bestType, bestQ], [respType, typeDef]) =>
      ((typeDef.q > bestQ) && matchesType(respType, typeDef)) ?
        [respType, typeDef.q] :
        [bestType, bestQ],
    init
  );

  return (pair[0] !== null) ? responders[pair[0]] : null;
}


function selectRequestHandler(requestHandlers: { [k: string]: RequestHandler }, contentType: string): RequestHandler | null {
  const handler = Object.keys(requestHandlers).find(k => {
    const [type, subType] = k.split('/');
    return matchesType(contentType, { type, subType });
  });

  return handler ? requestHandlers[handler] : null;
}
