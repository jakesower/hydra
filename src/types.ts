import { IncomingMessage } from 'http';

export type RequestHandler = (
  request: IncomingMessage,
  schema: Schema
) => Promise<HydraError | Action>;
export type Querier = (action: Action, schema: Schema) => Promise<HydraError | ActionResult>;
export type Responder = (
  results: HydraError | ActionResult,
  schema: Schema
) => Promise<HydraResponse>;

export interface GraphNode {
  type: string;
  id: string;
  attributes: { [k: string]: any };
  relationships: { [k: string]: GraphNode | GraphNode[] | null };
}

export interface QueryOne {
  type: string;
  id: string;
  relationships?: { [k: string]: any };
}

export interface QueryMany {
  type: string;
  relationships?: { [k: string]: any };
}

export type Query = QueryOne | QueryMany;

export interface Resource {
  type: string;
  id: string;
  attributes: { [k: string]: any };
  relationships?: {
    [k: string]: string | string[];
  };
}

export type Action = { get: Query } | { merge: Resource } | { delete: Resource };
export type ActionResult =
  | HydraError
  | { get: GraphNode | GraphNode[] | null }
  | { merge: void }
  | { delete: void };

export interface HydraError {
  hydraError: true;
  messages: string[];
  code?: string;
  meta?: any;
}

export interface HydraResponse {
  code: number;
  headers: { [k: string]: string };
  body: string;
}

// Refers to a parsed schema
export interface Schema {
  resources: { [k: string]: SchemaResource };
  title?: string;
  meta?: any;
}

export interface SchemaResource {
  key: string;
  attributes: { [k: string]: SchemaAttribute };
  relationships: { [k: string]: SchemaRelationship };
  meta?: any;
}

export interface SchemaAttribute {
  key: string;
  type: string;
  meta?: any;
}

export interface SchemaRelationship {
  key: string;
  cardinality: 'one' | 'many';
  type: string;
  inverse: string;
  meta?: any;
}

interface EqualityQueryRestraint {
  type: 'equal';
  field: string;
  value: string;
}

export type QueryConstraint = EqualityQueryRestraint;
