"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withAndroidGpuLibraries = void 0;
var _configPlugins = require("@expo/config-plugins");
var _Manifest = require("@expo/config-plugins/build/android/Manifest");
function addUsesNativeLibraryItemToMainApplication(mainApplication, item) {
  let existingMetaDataItem;
  const newItem = {
    $: (0, _Manifest.prefixAndroidKeys)(item)
  };
  if (mainApplication['uses-native-library'] !== undefined) {
    existingMetaDataItem = mainApplication['uses-native-library'].filter(e => e.$['android:name'] === item.name);
    if (existingMetaDataItem.length > 0 && existingMetaDataItem[0] !== undefined) existingMetaDataItem[0].$ = newItem.$;else mainApplication['uses-native-library'].push(newItem);
  } else {
    mainApplication['uses-native-library'] = [newItem];
  }
  return mainApplication;
}
const withAndroidGpuLibraries = (cfg, enabledLibraries) => (0, _configPlugins.withAndroidManifest)(cfg, config => {
  const mainApplication = _configPlugins.AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
  const gpuLibraries = [{
    name: 'libOpenCL.so',
    required: false
  }];
  if (Array.isArray(enabledLibraries)) {
    gpuLibraries.push(...enabledLibraries.map(lib => ({
      name: lib,
      required: false
    })));
  }
  gpuLibraries.forEach(lib => {
    addUsesNativeLibraryItemToMainApplication(mainApplication, lib);
  });
  return config;
});
exports.withAndroidGpuLibraries = withAndroidGpuLibraries;
//# sourceMappingURL=withAndroidGpuLibraries.js.map