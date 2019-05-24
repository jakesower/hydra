import { render } from 'ejs';
import { readFileSync } from 'fs';
import { ResultGraph, HydraError, HydraResponse, Schema } from '../types';
import { Either } from '../lib/either';
import { mapObj } from '../lib/utils';

const resourceTemplate = readFileSync(__dirname + '/html/resource.ejs', 'utf8');

export function HtmlResponder(results: Either<HydraError, ResultGraph>, schema: Schema): Promise<HydraResponse> {
  return Promise.resolve(results.split(handleError, handleOk));


  function handleError(err: HydraError): HydraResponse {
    return {
      code: 500,
      headers: {},
      body: 'Uh oh.'
    };
  }


  function handleOk(resultGraph: ResultGraph): HydraResponse {
    return {
      code: 500,
      headers: { 'Content-Type': 'text/html' },
      body: render(resourceTemplate, { schema, results: expandResults(resultGraph) }),
    };
  }


  function expandResults(resultGraph: ResultGraph) {
    const goCard = node => Array.isArray(node) ? node.map(go) : go(node);

    const go = ({ type, id }) => {
      const rels = Object.keys(schema.resources[type].relationships);
      const resource = resultGraph.resources[type][id];

      return mapObj(resource, (attr, name) => rels.includes(name) ? goCard(attr) : attr);
    }

    const normalize = x => Array.isArray(x) ? x.map(normalize) : { type: resultGraph.type, id: x };
    return goCard(normalize(resultGraph.root));
  }
}
