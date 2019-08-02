import { Either } from './either';
import { HydraError } from '../types';

interface HydraErrorInternals {
  messages: string[];
  code?: string;
  meta?: any;
}

export function errToHydraError(err: Either<HydraErrorInternals, any>): HydraError {
  return {
    ...err.getErrValue(),
    hydraError: true,
  };
}

export function mapHydraError(obj, fn) {
  return 'hydraError' in obj && obj.hydraError ? obj : fn(obj);
}
