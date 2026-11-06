// Wrap a constructor param type with this when injecting via forwardRef.
// It stops TypeScript from emitting a runtime reference to the class in the
// decorator metadata, which crashes ES modules with circular imports.
export type ForwardRef<T> = T;
