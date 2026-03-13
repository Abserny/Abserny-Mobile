import type { WorkletFunction, WorkletRuntime, WorkletRuntimeConfig } from './types';
export declare function createWorkletRuntime(config?: WorkletRuntimeConfig): WorkletRuntime;
export declare function createWorkletRuntime(name?: string, initializer?: () => void): WorkletRuntime;
export declare function runOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue): WorkletFunction<Args, ReturnValue>;
export declare function scheduleOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): void;
//# sourceMappingURL=runtimes.d.ts.map