module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            [
                'babel-preset-expo',
                {
                    // Polyfills import.meta for Hermes compatibility.
                    // Required by @huggingface/transformers and other ESM libraries
                    // that use import.meta.url internally.
                    // See: https://docs.expo.dev/guides/using-esm/
                    unstable_transformImportMeta: true,
                },
            ],
        ],
    };
};
