"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ejs_1 = require("ejs");
const fs_1 = require("fs");
const utils_1 = require("../lib/utils");
const resourceTemplate = fs_1.readFileSync(__dirname + '/html/resource.ejs', 'utf8');
function HtmlResponder(results, schema) {
    return Promise.resolve(results.split(handleError, handleOk));
    function handleError(err) {
        return {
            code: 500,
            headers: {},
            body: 'Uh oh.',
        };
    }
    function handleOk(resultGraph) {
        return {
            code: 500,
            headers: { 'Content-Type': 'text/html' },
            body: ejs_1.render(resourceTemplate, {
                schema,
                results: expandResults(resultGraph),
            }),
        };
    }
    function expandResults(resultGraph) {
        const goCard = node => (Array.isArray(node) ? node.map(go) : go(node));
        const go = ({ type, id }) => {
            const rels = Object.keys(schema.resources[type].relationships);
            const resource = resultGraph.resources[type][id];
            return utils_1.mapObj(resource, (attr, name) => rels.includes(name) ? goCard(attr) : attr);
        };
        const normalize = x => Array.isArray(x) ? x.map(normalize) : { type: resultGraph.type, id: x };
        return goCard(normalize(resultGraph.root));
    }
}
exports.HtmlResponder = HtmlResponder;
