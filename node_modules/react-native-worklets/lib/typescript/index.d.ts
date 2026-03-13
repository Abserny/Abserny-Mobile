export { isShareableRef, makeShareable, type MakeShareableClone, makeShareableCloneOnUIRecursive, makeShareableCloneRecursive, shareableMappingCache, type ShareableRef, } from './deprecated';
export { getDynamicFeatureFlag, getStaticFeatureFlag, setDynamicFeatureFlag, } from './featureFlags/featureFlags';
export { isSynchronizable } from './memory/isSynchronizable';
export { createSerializable, isSerializableRef, registerCustomSerializable, } from './memory/serializable';
export { serializableMappingCache } from './memory/serializableMappingCache';
export { createSynchronizable } from './memory/synchronizable';
export type { RegistrationData, SerializableRef, Synchronizable, SynchronizableRef, } from './memory/types';
export { getRuntimeKind, RuntimeKind } from './runtimeKind';
export { createWorkletRuntime, runOnRuntime, scheduleOnRuntime, } from './runtimes';
export { callMicrotasks, executeOnUIRuntimeSync, runOnJS, runOnUI, runOnUIAsync, runOnUISync, scheduleOnRN, scheduleOnUI, unstable_eventLoopTask, } from './threads';
export type { WorkletFunction, WorkletRuntime, WorkletStackDetails, } from './types';
export { isWorkletFunction } from './workletFunction';
export { WorkletsModule } from './WorkletsModule/NativeWorklets';
export type { IWorkletsModule, WorkletsModuleProxy, } from './WorkletsModule/workletsModuleProxy';
//# sourceMappingURL=index.d.ts.map