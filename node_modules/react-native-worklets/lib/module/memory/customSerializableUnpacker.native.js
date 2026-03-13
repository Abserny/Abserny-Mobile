/* eslint-disable reanimated/use-worklets-error */
'use strict';

export function __installUnpacker() {
  if (!globalThis.__customSerializationRegistry) {
    globalThis.__customSerializationRegistry = [];
  }
  const registry = globalThis.__customSerializationRegistry;
  function customSerializableUnpacker(value, typeId) {
    const data = registry[typeId];
    if (!data) {
      throw new Error(`[Worklets] No custom serializable registered for type ID ${typeId}.`);
    }
    return data.unpack(value);
  }
  globalThis.__customSerializableUnpacker = customSerializableUnpacker;
}
//# sourceMappingURL=customSerializableUnpacker.native.js.map