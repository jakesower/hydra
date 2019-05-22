"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// inlines keys and otherwise makes a schema easier to work with
function expandSchema(rawSchema) {
    return utils_1.overPath(rawSchema, ['resources'], resources => utils_1.inlineKey(utils_1.mapObj(resources, r => (Object.assign({}, r, { attributes: utils_1.inlineKey(r.attributes), relationships: utils_1.inlineKey(r.relationships) })))));
}
exports.expandSchema = expandSchema;
