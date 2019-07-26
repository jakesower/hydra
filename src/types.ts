import { IncomingMessage } from 'http';
import { Either } from './lib/either';

// is the notion of sparseness important?

export type RequestHandler = (request: IncomingMessage, schema: Schema) => Promise<Either<HydraError, QueryGraph>>;
export type Querier = (query: QueryGraph, schema: Schema) => Promise<Either<HydraError, ResultGraph>>;
export type Responder = (results: Either<HydraError, ResultGraph>, schema: Schema) => Promise<HydraResponse>;

export type RequestGraph = QueryGraph | GraphFragment;

export interface SparseGraphFragment {
  root: SparseGraphNode,
}

export interface GraphFragment {
  root: GraphNode,
}

export interface GraphNode {
  type: string,
  id: string,
  attributes: { [k: string]: any },
  relationships: { [k: string]: GraphRelationship },
}

interface ManyGraphRelationship {
  cardinality: 'many',
  nodes: GraphNode[],
}

interface OneGraphRelationship {
  cardinality: 'one',
  node: GraphNode,
}

export type GraphRelationship = ManyGraphRelationship | OneGraphRelationship;

export interface SparseGraphNode {
  type: string,
  id: string,
  attributes?: { [k: string]: any },
  relationships?: { [k: string]: GraphRelationship },
}

interface SparseManyGraphRelationship {
  cardinality: 'many',
  nodes: SparseGraphNode[],
}

interface SparseOneGraphRelationship {
  cardinality: 'one',
  node: SparseGraphNode,
}

export type SparseGraphRelationship = SparseManyGraphRelationship | SparseOneGraphRelationship;


export interface QueryGraph {
  type: string,
  cardinality: 'one' | 'many',
  relationships: { [k: string]: QueryGraph },
  constraints: QueryConstraint[],
  meta?: any,
}

export interface MergeGraph {
  action: 'merge',
  root: SparseGraphFragment,
}

export type ActionGraph = QueryGraph | MergeGraph;

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
  resources: { [k: string]: SchemaResource }
  title?: string,
  meta?: any
}

export interface SchemaResource {
  key: string,
  attributes: { [k: string]: SchemaAttribute },
  relationships: { [k: string]: SchemaRelationship },
  meta?: any
}

export interface SchemaAttribute {
  key: string,
  type: string,
  meta?: any,
}

export interface SchemaRelationship {
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
