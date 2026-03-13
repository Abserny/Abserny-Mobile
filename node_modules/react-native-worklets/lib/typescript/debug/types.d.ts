export type WorkletsError = Error & {
    name: 'Worklets';
};
export interface IWorkletsErrorConstructor extends Error {
    new (message?: string): WorkletsError;
    (message?: string): WorkletsError;
    readonly prototype: WorkletsError;
}
//# sourceMappingURL=types.d.ts.map