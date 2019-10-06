import { parse as parseUrl } from 'url';
import { chainPipeThru, parseQueryParams } from '@polygraph/utils';
import { Ok, Err } from '../lib/either';
import { get } from './get';
import { tag } from '../lib/element-tags';

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

export async function JsonApiRequestHandler({ request, schema, querier }) {
  // these variables are useful across the entire request
  const { pathname, query } = parseUrl(request.url, true);
  const pathChunks = (pathname || '').split('/').splice(1);
  const requestQuery = parseQueryParams(query);

  const result = chainPipeThru(Ok(request), [validateRequest, validateParams, validateSchema]);

  if (result.isErr()) {
    return tag('error', result.getErrValue());
  }

  return get({ requestQuery, querier, pathChunks, schema });

  // Functions

  function validateRequest(request) {
    const chunks = (pathname || '').split('/').splice(1);

    // Group resource requests
    if (chunks.length < 5) {
      return Object.keys(schema.resources).includes(chunks[0])
        ? Ok(request)
        : Err({ messages: [`${chunks[0]} is not a valid resource`] });
    }

    return Err({ messages: ['not implemented'] });
  }

  function validateParams(request) {
    const supportedParams = ['include', 'fields', 'sort'];
    const { query } = parseUrl(request.url, true);
    const requestQuery = parseQueryParams(query);
    const testKey = k => /^[a-z]+$/.test(k.split(/[^-a-zA-Z_]/)[0]);
    const bad = Object.keys(requestQuery).filter(k => !supportedParams.includes(k) && testKey(k));

    return bad.length === 0
      ? Ok(request)
      : Err({ messages: bad.map(k => `${k} is not a supported parameter`) });
  }

  function validateSchema(request) {
    return Ok(request);
  }
}
