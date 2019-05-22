import { ResultGraph, HydraError, HydraResponse, Schema } from '../types';
import { Either } from '../lib/either';

export function HtmlResponder(results: Either<HydraError, ResultGraph>, schema: Schema): Promise<HydraResponse> {
  return results.split(handleError, handleOk);


  function handleError(err: HydraError): Promise<HydraResponse> {
    return Promise.resolve({
      code: 500,
      headers: {},
      body: 'Uh oh.'
    });
  }


  function handleOk(ResultGraph: ResultGraph): Promise<HydraResponse> {
    return Promise.resolve({
      code: 200,
      headers: {},
      body: 'Oh goodie!'
    });
  }
}
