/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! exports provided: hydra */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"hydra\", function() { return hydra; });\n!(function webpackMissingModule() { var e = new Error(\"Cannot find module './lib/utils'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\n\n\nfunction hydra({ requestHandlers, querier, responders, schema }) {\n  return async (req, res) => {\n    try {\n      const responder = selectResponder(responders, req.headers.accept || '');\n\n      if (!responder) {\n        return sendResponse({ code: 406, headers: {}, body: '' }, res);\n      }\n\n      const requestHandler = selectRequestHandler(\n        requestHandlers,\n        req.headers['content-type'] || ''\n      );\n\n      // TODO: let responders handle 415s\n      if (!requestHandler) {\n        return sendResponse({ code: 415, headers: {}, body: '' }, res);\n      }\n\n      const actionResult = await requestHandler({ request: req, schema, querier });\n      const response = await responder(actionResult);\n\n      sendResponse(response, res);\n    } catch (err) {\n      console.log(err);\n      return sendResponse({ code: 500, headers: {}, body: '' }, res);\n    }\n  };\n}\n\nfunction sendResponse(response, resHandle) {\n  resHandle.statusCode = response.code;\n  Object.keys(response.headers).forEach(k => {\n    resHandle.setHeader(k, response.headers[k]);\n  });\n  resHandle.write(response.body);\n  resHandle.end();\n}\n\nfunction clean(s) {\n  // TODO: Handle quoted parameters: https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4\n  return s.replace(/\\s/g, '');\n}\n\nfunction acceptTable(rawTypeStr) {\n  const [typeStr, ...rawParams] = clean(rawTypeStr).split(';');\n  const [type, subType] = typeStr.split('/');\n  const params = !(function webpackMissingModule() { var e = new Error(\"Cannot find module './lib/utils'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(\n    rawParams.map(param => {\n      const [k, v] = param.split('=');\n      return { [k]: v };\n    })\n  );\n\n  return {\n    type,\n    subType,\n    q: Number(params.q || 1),\n    params,\n  };\n}\n\nfunction matchesType(concreteType, typeDef) {\n  const [m, s] = concreteType.split('/');\n  return (\n    typeDef.type === '*' ||\n    (typeDef.type === m && (typeDef.subType === '*' || typeDef.subType === s))\n  );\n}\n\nfunction parseAccept(acceptString) {\n  return acceptString.split(',').map(acceptTable);\n}\n\nfunction selectResponder(responders, acceptString) {\n  const parsed = parseAccept(acceptString);\n  const pairings = !(function webpackMissingModule() { var e = new Error(\"Cannot find module './lib/utils'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(Object.keys(responders), parsed);\n\n  const init = [null, 0];\n  const pair = pairings.reduce(\n    ([bestType, bestQ], [respType, typeDef]) =>\n      typeDef.q > bestQ && matchesType(respType, typeDef)\n        ? [respType, typeDef.q]\n        : [bestType, bestQ],\n    init\n  );\n\n  return pair[0] !== null ? responders[pair[0]] : null;\n}\n\nfunction selectRequestHandler(requestHandlers, contentType) {\n  const handler = Object.keys(requestHandlers).find(k => {\n    const [type, subType] = k.split('/');\n    return matchesType(contentType, { type, subType });\n  });\n\n  return handler ? requestHandlers[handler] : null;\n}\n\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ })

/******/ });