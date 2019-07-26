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
            function buildQuery(rootGraph) {
                const go = (graph, path) => {
                    const { attributes } = schema.resources[graph.type];
                    const attrNames = Object.keys(attributes);
                    const relationships = Object.keys(graph.relationships);
                    const table = `${path.join('$')}`;
                    const kids = Object.values(graph.relationships)
                        .map((r, idx) => go(r, [...path, idx]))
                        .reduce(utils_1.appendKeys, { selections: [], joins: [], constraints: [] });
                    const joins = relationships.map((rel, idx) => join(graph.type, rel, table, `${table}$${idx}`));
                    return utils_1.appendKeys(kids, {
                        selections: [
                            `${table}.id AS ${table}$$id`,
                            ...attrNames.map((attr, idx) => `${table}.${attr} AS ${table}$$${idx}`),
                        ],
                        joins,
                        constraints: graph.constraints.map(c => [
                            `${table}.${c.field} = ?`,
                            c.value,
                        ]),
                    });
                };
                const { selections, joins, constraints } = go(rootGraph, ['root']);
                const fromStr = `FROM ${rootGraph.type} AS root`;
                const whereStr = constraints.length > 0
                    ? `WHERE ${constraints.map(c => c[0]).join(' AND ')}`
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
                const root = rootGraph.cardinality === 'one'
                    ? results.length > 0
                        ? results[0].root$$id
                        : null
                    : utils_1.uniq(results.map(r => r.root$$id));
                const baseResources = utils_1.uniq(flattenQueryGraph(rootGraph).map(graph => graph.type)).reduce((acc, type) => (Object.assign({}, acc, { [type]: {} })), {});
                const extracters = reduceQueryGraph(rootGraph, {}, (acc, graph, path) => {
                    const table = ['root', ...path].join('$');
                    const rDef = schema.resources[graph.type];
                    const extractFn = (row, curVal) => {
                        const attrExtracters = Object.keys(rDef.attributes).reduce((acc, attr, idx) => (Object.assign({}, acc, { [attr]: row[`${table}$$${idx}`] })), {});
                        const relExtracters = Object.keys(graph.relationships).reduce((acc, relName, idx) => {
                            const rel = graph.relationships[relName];
                            const base = rel.cardinality === 'many'
                                ? curVal
                                    ? curVal[relName]
                                    : []
                                : null;
                            const obj = {
                                type: rel.type,
                                id: row[`${table}$${idx}$$id`],
                            };
                            return Object.assign({}, acc, { [relName]: rel.cardinality === 'many' ? [...base, obj] : obj });
                        }, {});
                        return Object.assign({}, attrExtracters, relExtracters);
                    };
                    return Object.assign({}, acc, { [table]: extractFn });
                });
                const tables = reduceQueryGraph(rootGraph, [], (acc, g, path) => [
                    ...acc,
                    { table: ['root', ...path].join('$'), type: g.type },
                ]);
                let output = {
                    root,
                    type: rootGraph.type,
                    cardinality: rootGraph.cardinality,
                    resources: baseResources,
                };
                results.forEach(row => {
                    // layer in resources
                    tables.forEach(({ table, type }) => {
                        const curVal = output.resources[type][row[`${table}$$id`]];
                        output.resources[type][row[`${table}$$id`]] = extracters[table](row, curVal);
                    });
                });
                return either_1.Ok(output);
            }
            function join(localType, localRelName, localTableName, foreignTableName) {
                const localDef = schema.resources[localType].relationships[localRelName];
                const inverseRel = schema.resources[localDef.type].relationships[localDef.inverse];
                const foreignType = localDef.type;
                if (localDef.cardinality === inverseRel.cardinality) {
                    throw 'not supported';
                }
                const base = `INNER JOIN ${foreignType} AS ${foreignTableName} ON`;
                return localDef.cardinality === 'many'
                    ? `${base} ${foreignTableName}.${localType}_id = ${localTableName}.id`
                    : `${base} ${localTableName}.${foreignType}_id = ${foreignTableName}.id`;
            }
            function flattenQueryGraph(graph) {
                return [
                    graph,
                    ...utils_1.unnest(Object.values(graph.relationships).map(flattenQueryGraph)),
                ];
            }
            function reduceQueryGraph(graph, init, reducer) {
                const flatWithPath = (g, p) => [
                    [g, p],
                    ...utils_1.unnest(Object.values(g.relationships).map((rel, idx) => flatWithPath(rel, [...p, idx]))),
                ];
                return flatWithPath(graph, []).reduce((acc, [g, p]) => reducer(acc, g, p), init);
            }
        });
    };
}
exports.SqliteQuerier = SqliteQuerier;
