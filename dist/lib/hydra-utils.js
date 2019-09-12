'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
function errToHydraError(err) {
  return Object.assign({}, err.getErrValue(), { hydraError: true });
}
exports.errToHydraError = errToHydraError;
function mapHydraError(obj, fn) {
  return 'hydraError' in obj && obj.hydraError ? obj : fn(obj);
}
exports.mapHydraError = mapHydraError;
