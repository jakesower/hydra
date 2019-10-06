// import { HydraError, Schema, QueryGraph, ResultGraph } from '../types';
// import { Either, Ok } from '../lib/either';
// import { Database } from 'sqlite3';
// import { appendKeys, uniq, unnest } from '@polygraph/utils';

// export function SqliteQuerier(db: Database) {
//   return async function(
//     queryGraph: QueryGraph,
//     schema: Schema
//   ): Promise<Either<HydraError, ResultGraph>> {
//     const { query, params } = buildQuery(queryGraph);
//     const results = await runQuery(query, params);

//     return buildResults(queryGraph, results);

//     function buildQuery(rootGraph: QueryGraph) {
//       const go = (graph: QueryGraph, path: (number | string)[]) => {
//         const { attributes } = schema.resources[graph.type];
//         const attrNames = Object.keys(attributes);
//         const relationships = Object.keys(graph.relationships);
//         const table = `${path.join('$')}`;
//         const kids = Object.values(graph.relationships)
//           .map((r, idx) => go(r, [...path, idx]))
//           .reduce(appendKeys, { selections: [], joins: [], constraints: [] });

//         const joins = relationships.map((rel, idx) =>
//           join(graph.type, rel, table, `${table}$${idx}`)
//         );

//         return appendKeys<{ [k: string]: any }, string>(kids, {
//           selections: [
//             `${table}.id AS ${table}$$id`,
//             ...attrNames.map(
//               (attr, idx) => `${table}.${attr} AS ${table}$$${idx}`
//             ),
//           ],
//           joins,
//           constraints: graph.constraints.map(c => [
//             `${table}.${c.field} = ?`,
//             c.value,
//           ]),
//         });
//       };

//       const { selections, joins, constraints } = go(rootGraph, ['root']);

//       const fromStr = `FROM ${rootGraph.type} AS root`;
//       const whereStr =
//         constraints.length > 0
//           ? `WHERE ${constraints.map(c => c[0]).join(' AND ')}`
//           : '';

//       return {
//         query: `SELECT ${selections.join(', ')} ${fromStr} ${joins.join(
//           ' '
//         )} ${whereStr}`,
//         params: constraints.map(c => c[1]),
//       };
//     }

//     function runQuery(
//       query: string,
//       params: string[]
//     ): Promise<{ [k: string]: any }[]> {
//       return new Promise((resolve, reject) => {
//         db.prepare(query, params).all((err, rows) => {
//           if (err) {
//             return reject(err);
//           }

//           resolve(rows);
//         });
//       });
//     }

//     function buildResults(
//       rootGraph: QueryGraph,
//       results: { [k: string]: any }[]
//     ): Either<HydraError, ResultGraph> {
//       const root =
//         rootGraph.cardinality === 'one'
//           ? results.length > 0
//             ? results[0].root$$id
//             : null
//           : uniq(results.map(r => r.root$$id));

//       const baseResources: { [k: string]: { [k: string]: any } } = uniq(
//         flattenQueryGraph(rootGraph).map(graph => graph.type)
//       ).reduce((acc, type) => ({ ...acc, [type]: {} }), {});

//       const extracters = reduceQueryGraph(rootGraph, {}, (acc, graph, path) => {
//         const table = ['root', ...path].join('$');
//         const rDef = schema.resources[graph.type];

//         const extractFn = (row, curVal) => {
//           const attrExtracters = Object.keys(rDef.attributes).reduce(
//             (acc, attr, idx) => ({
//               ...acc,
//               [attr]: row[`${table}$$${idx}`],
//             }),
//             {}
//           );

//           const relExtracters = Object.keys(graph.relationships).reduce(
//             (acc, relName, idx) => {
//               const rel = graph.relationships[relName];

//               const base =
//                 rel.cardinality === 'many'
//                   ? curVal
//                     ? curVal[relName]
//                     : []
//                   : null;

//               const obj = {
//                 type: rel.type,
//                 id: row[`${table}$${idx}$$id`],
//               };

//               return {
//                 ...acc,
//                 [relName]: rel.cardinality === 'many' ? [...base, obj] : obj,
//               };
//             },
//             {}
//           );

//           return {
//             ...attrExtracters,
//             ...relExtracters,
//           };
//         };

//         return { ...acc, [table]: extractFn };
//       });

//       const tables = reduceQueryGraph<{ table: string; type: string }[]>(
//         rootGraph,
//         [],
//         (acc, g, path) => [
//           ...acc,
//           { table: ['root', ...path].join('$'), type: g.type },
//         ]
//       );

//       let output = {
//         root,
//         type: rootGraph.type,
//         cardinality: rootGraph.cardinality,
//         resources: baseResources,
//       };

//       results.forEach(row => {
//         // layer in resources
//         tables.forEach(({ table, type }) => {
//           const curVal = output.resources[type][row[`${table}$$id`]];

//           output.resources[type][row[`${table}$$id`]] = extracters[table](
//             row,
//             curVal
//           );
//         });
//       });

//       return Ok(output) as Either<HydraError, ResultGraph>;
//     }

//     function join(localType, localRelName, localTableName, foreignTableName) {
//       const localDef = schema.resources[localType].relationships[localRelName];
//       const inverseRel =
//         schema.resources[localDef.type].relationships[localDef.inverse];
//       const foreignType = localDef.type;

//       if (localDef.cardinality === inverseRel.cardinality) {
//         throw 'not supported';
//       }

//       const base = `INNER JOIN ${foreignType} AS ${foreignTableName} ON`;
//       return localDef.cardinality === 'many'
//         ? `${base} ${foreignTableName}.${localType}_id = ${localTableName}.id`
//         : `${base} ${localTableName}.${foreignType}_id = ${foreignTableName}.id`;
//     }

//     function flattenQueryGraph(graph: QueryGraph): QueryGraph[] {
//       return [
//         graph,
//         ...unnest(Object.values(graph.relationships).map(flattenQueryGraph)),
//       ];
//     }

//     function reduceQueryGraph<T>(
//       graph: QueryGraph,
//       init: T,
//       reducer: (acc: T, graph: QueryGraph, path: number[]) => T
//     ): T {
//       const flatWithPath = (g, p) => [
//         [g, p],
//         ...unnest(
//           Object.values(g.relationships).map((rel, idx) =>
//             flatWithPath(rel, [...p, idx])
//           )
//         ),
//       ];

//       return flatWithPath(graph, []).reduce(
//         (acc, [g, p]) => reducer(acc, g, p),
//         init
//       );
//     }
//   };
// }
