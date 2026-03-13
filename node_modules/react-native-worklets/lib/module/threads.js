'use strict';

import { WorkletsError } from './debug/WorkletsError';
import { mockedRequestAnimationFrame } from './runLoop/uiRuntime/mockedRequestAnimationFrame';
export function callMicrotasks() {
  // on web flushing is a noop as immediates are handled by the browser
}
export function scheduleOnUI(worklet, ...args) {
  enqueueUI(worklet, args);
}
export function runOnUI(worklet) {
  return (...args) => {
    scheduleOnUI(worklet, ...args);
  };
}
export function runOnUISync() {
  throw new WorkletsError('`runOnUISync` is not supported on web.');
}
export function executeOnUIRuntimeSync() {
  throw new WorkletsError('`executeOnUIRuntimeSync` is not supported on web.');
}
export function runOnJS(fun) {
  return (...args) => scheduleOnRN(fun, ...args);
}
export function scheduleOnRN(fun, ...args) {
  queueMicrotask(args.length ? () => fun(...args) : fun);
}
export function runOnUIAsync(worklet, ...args) {
  return new Promise(resolve => {
    enqueueUI(worklet, args, resolve);
  });
}
let runOnUIQueue = [];
function enqueueUI(worklet, args, resolve) {
  const job = [worklet, args, resolve];
  runOnUIQueue.push(job);
  if (runOnUIQueue.length === 1) {
    flushUIQueue();
  }
}
function flushUIQueue() {
  queueMicrotask(() => {
    const queue = runOnUIQueue;
    runOnUIQueue = [];
    requestAnimationFrameImpl(() => {
      queue.forEach(([workletFunction, workletArgs, jobResolve]) => {
        const result = workletFunction(...workletArgs);
        if (jobResolve) {
          jobResolve(result);
        }
      });
    });
  });
}

// eslint-disable-next-line camelcase
export function unstable_eventLoopTask() {
  throw new WorkletsError('`unstable_eventLoopTask` is not supported on web.');
}
const requestAnimationFrameImpl = !globalThis.requestAnimationFrame ? mockedRequestAnimationFrame : globalThis.requestAnimationFrame;
//# sourceMappingURL=threads.js.map