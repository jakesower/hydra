import { ResultGraph, HydraError, HydraResponse, Schema } from '../types';
import { Either } from '../lib/either';

export function JsonapiResponder(results: Either<HydraError, ResultGraph>, schema: Schema): Promise<HydraResponse> {
  const details = results.split(handleError, handleOk);

  const meta = {
    description: "why hello there",
  };



  function handleError(err: HydraError) {
    return Promise.resolve({
      code: 500,
      headers: {},
      body: 'Uh oh.'
    });
  }


  function handleOk(resultGraph: ResultGraph) {
    const expandRoot = id => resultGraph.resources[resultGraph.type][id];

    return {
      data: resultGraph.cardinality === 'one' ?
        expandRoot(resultGraph.root) :
        resultGraph.root.map(expandRoot),
    };
  }
}
