import { IncomingMessage } from 'http';
import { Either } from './lib/either';

export type RequestHandler = (request: IncomingMessage, schema: Schema) => Promise<Either<HydraError, QueryGraph>>;
export type Querier = (query: QueryGraph, schema: Schema) => Promise<Either<HydraError, ResultGraph>>;
export type Responder = (response: Either<HydraError, ResultGraph>, schema: Schema) => Promise<HydraResponse>;

export interface QueryGraph {
  cardinality: 'one' | 'many',
  type: string,
  constraints: QueryConstraint[],
  relationships: { [k: string]: QueryGraph },
  meta?: any,
}

interface ResultGraphBase {
  type: string,
  resources: { [k: string]: { [k: string]: any } },
  meta?: any,
}

interface ResultGraphMany extends ResultGraphBase {
  cardinality: 'many',
  root: string[]
}

interface ResultGraphOne extends ResultGraphBase {
  cardinality: 'one',
  root: string
}

export type ResultGraph = ResultGraphMany | ResultGraphOne;

export interface HydraError {
  messages: string[],
  code?: string,
  meta?: any,
}

export interface HydraResponse {
  code: number,
  headers: { [k: string]: string },
  body: string,
}

// Refers to a parsed schema
export interface Schema {
  resources: { [k: string]: Resource }
  meta?: any
}

export interface Resource {
  key: string,
  attributes: { [k: string]: Attribute },
  relationships: { [k: string]: Relationship },
  meta?: any
}

export interface Attribute {
  key: string,
  type: string,
  meta?: any,
}

export interface Relationship {
  key: string,
  cardinality: "one" | "many",
  type: string,
  inverse: string,
  meta?: any,
}

interface EqualityQueryRestraint {
  type: 'equal',
  field: string,
  value: string,
}

export type QueryConstraint = EqualityQueryRestraint;
