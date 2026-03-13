export type DynamicFlagsType = {
    EXAMPLE_DYNAMIC_FLAG: boolean;
    init(): void;
    setFlag(name: DynamicFlagName, value: boolean): void;
    getFlag(name: DynamicFlagName): boolean;
};
export type DynamicFlagName = keyof Omit<Omit<DynamicFlagsType, 'setFlag' | 'getFlag'>, 'init'>;
/**
 * This constant is needed for typechecking and preserving static typechecks in
 * generated .d.ts files. Without it, the static flags resolve to an object
 * without specific keys.
 */
export declare const DefaultStaticFeatureFlags: {
    readonly RUNTIME_TEST_FLAG: false;
    readonly IOS_DYNAMIC_FRAMERATE_ENABLED: false;
};
export type StaticFeatureFlagsSchema = {
    -readonly [K in keyof typeof DefaultStaticFeatureFlags]: boolean;
};
//# sourceMappingURL=types.d.ts.map