'use strict';

import { WorkletsError } from './debug/WorkletsError';
export function createWorkletRuntime() {
  throw new WorkletsError('`createWorkletRuntime` is not supported on web.');
}
export function runOnRuntime() {
  throw new WorkletsError('`runOnRuntime` is not supported on web.');
}
export function scheduleOnRuntime() {
  throw new WorkletsError('`scheduleOnRuntime` is not supported on web.');
}
//# sourceMappingURL=runtimes.js.map