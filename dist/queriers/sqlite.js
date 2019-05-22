"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const either_1 = require("../lib/either");
const utils_1 = require("../lib/utils");
function SqliteQuerier(db) {
    return function (queryGraph, schema) {
        return __awaiter(this, void 0, void 0, function* () {
            const { query, params } = buildQuery(queryGraph);
            const results = yield runQuery(query, params);
            return buildResults(queryGraph, results);
            // helper functions
            function buildQuery(rootGraph) {
                const go = (graph, path) => {
                    const { attributes } = schema.resources[graph.type];
                    const attrNames = Object.keys(attributes);
                    const relationships = Object.values(graph.relationships);
                    const table = `${path.join('$')}`;
                    const kids = Object.values(graph.relationships)
                        .map((r, idx) => go(r, [...path, idx]))
                        .reduce(utils_1.appendKeys, { selections: [], joins: [], constraints: [] });
                    const joins = relationships.map((rel, idx) => {
                        join(graph.type, rel, table, `${table}$${idx}`);
                    });
                    return utils_1.appendKeys(kids, {
                        selections: [
                            `${table}.id AS ${table}$$id`,
                            ...attrNames.map((attr, idx) => `${table}.${attr} AS ${table}$$${idx}`),
                        ],
                        joins,
                        constraints: graph.constraints.map(c => [`${table}.${c.field} = ?`, c.value]),
                    });
                };
                const { selections, joins, constraints } = go(rootGraph, ['root']);
                const fromStr = `FROM ${rootGraph.type} AS root`;
                const whereStr = constraints.length > 0 ?
                    `WHERE ${constraints.map(c => c[0]).join(' AND ')}`
                    : '';
                return {
                    query: `SELECT ${selections.join(', ')} ${fromStr} ${joins.join(' ')} ${whereStr}`,
                    params: constraints.map(c => c[1]),
                };
            }
            function runQuery(query, params) {
                return new Promise((resolve, reject) => {
                    db.prepare(query, params).all((err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(rows);
                    });
                });
            }
            function buildResults(rootGraph, results) {
                const root = rootGraph.cardinality === 'one' ?
                    (results.length > 0 ? results[0].root$$id : null) :
                    utils_1.uniq(results.map(r => r.root$$id));
                const baseResources = utils_1.uniq(flattenQueryGraph(rootGraph).map(graph => graph.type))
                    .reduce((acc, type) => (Object.assign({}, acc, { [type]: {} })), {});
                const attrExtracters = reduceQueryGraph(rootGraph, {}, (acc, graph, path) => {
                    const table = `root$${path.join('$')}`;
                    const rDef = schema.resources[graph.type];
                    const extractFn = row => Object.keys(rDef.attributes).reduce((acc, attr, idx) => (Object.assign({}, acc, { [attr]: row[`${table}$$${idx}`] })), {});
                    return Object.assign({}, acc, { [table]: extractFn });
                });
                const tables = reduceQueryGraph(rootGraph, [], (acc, g, path) => [...acc, { table: `${root}$${path.join('$')}`, type: g.type }]);
                let output = {
                    root,
                    type: rootGraph.type,
                    cardinality: rootGraph.cardinality,
                    resources: baseResources
                };
                results.forEach(row => {
                    // layer in resources
                    tables.forEach(({ table, type }) => {
                        output.resources[type][row[`${table}$$id`]], attrExtracters[table](row);
                    });
                });
                return either_1.Ok(output);
            }
            function join(localType, localRel, localTableName, foreignTableName) {
                const inverseRel = schema.resources[localRel.type].relationships[localRel.inverse];
                const foreignType = localRel.type;
                if (localRel.cardinality === inverseRel.cardinality) {
                    throw 'not supported';
                }
                return localRel.cardinality === 'many' ?
                    `INNER JOIN ${foreignTableName} ON ${foreignTableName}.${localType}_id = ${localTableName}.id` :
                    `INNER JOIN ${foreignTableName} ON ${localTableName}.${foreignType}_id = ${foreignTableName}.id`;
            }
            // relationships go from the root out (affects one to many relationships)
            // function link(localRel, localTableName, foreignTableName) {
            //   const inverseRel = schema.resources[localRel.type].relationships[localRel.inverse];
            //   const localLinkKey = `${localRel.type}_id`;
            //   const inverseLinkKey = `${inverseRel.type}_id`;
            //   return localRel.cardinality === 'many' ?
            //     foreignTableName[inverseLinkKey] :
            //     localTableName[localLinkKey];
            // }
            function flattenQueryGraph(graph) {
                return [
                    graph,
                    ...Object.values(graph.relationships).flatMap(flattenQueryGraph)
                ];
            }
            function reduceQueryGraph(graph, init, reducer) {
                const flatWithPath = (g, p) => [
                    [g, p],
                    ...Object.values(g.relationships).flatMap((rel, idx) => flatWithPath(rel, [...p, idx]))
                ];
                return flatWithPath(graph, []).reduce((acc, [g, p]) => reducer(acc, g, p), init);
            }
            //   function mapQueryGraph<T>(
            //     graph: QueryGraph,
            //     fn: (graph: QueryGraph, path: number[]) => T,
            //   ): T[] {
            //     const flatWithPath = (g, p) => [
            //       [g, p],
            //       ...Object.values(g.relationships).flatMap((rel, idx) => flatWithPath(rel, [...p, idx]))
            //     ];
            //     return flatWithPath(graph, []).reduce((acc, [g, p]) => reducer(acc, g, p), init);
            //   }
        });
    };
}
exports.SqliteQuerier = SqliteQuerier;
