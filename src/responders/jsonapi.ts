import { ResultGraph, HydraError, HydraResponse, Schema } from '../types';
import { Either } from '../lib/either';
import { pluckKeys, reduceObj, omitKeys } from '../lib/utils';

export function JsonApiResponder(results: Either<HydraError, ResultGraph>, schema: Schema): Promise<HydraResponse> {
  const details = results.split(handleError, handleOk);

  const meta = {
    description: "why hello there",
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



  function handleError(errors: HydraError): { code: number, payload: { [k: string]: any }} {
    return {
      code: 400,
      payload: {
        errors: errors.messages.map(err => ({ detail: err }))
      },
    };
  }


  function handleOk(resultGraph: ResultGraph): { code: number, payload: { [k: string]: any }} {
    const formatResource = (type, id) => {
      const resource = resultGraph.resources[type][id];
      const def = schema.resources[type];

      return {
        type,
        id,
        attributes: pluckKeys(resource, Object.keys(def.attributes)),
        relationships: pluckKeys(resource, Object.keys(def.relationships)),
      };
    };

    const expandRoot = id => formatResource(resultGraph.type, id);

    const data = resultGraph.cardinality === 'one' ?
      expandRoot(resultGraph.root) :
      resultGraph.root.map(expandRoot);

    const rootIds = resultGraph.cardinality === 'one' ? [resultGraph.root] : resultGraph.root;
    const includedResources = {
      ...resultGraph.resources,
      [resultGraph.type]: omitKeys(resultGraph.resources[resultGraph.type], rootIds)
    };

    const included = reduceObj(includedResources, <any[]>[], (acc, resourcesOfType, type) => [
      ...acc,
      ...Object.keys(resourcesOfType).map(id => formatResource(type, id))
    ]);

    return {
      code: 200,
      payload: {
        data,
        included,
      },
    };
  }
}
