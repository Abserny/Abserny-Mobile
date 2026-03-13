'use strict';

export function isSynchronizable(value) {
  'worklet';

  return typeof value === 'object' && value !== null && '__synchronizableRef' in value && value.__synchronizableRef === true;
}
//# sourceMappingURL=isSynchronizable.native.js.map