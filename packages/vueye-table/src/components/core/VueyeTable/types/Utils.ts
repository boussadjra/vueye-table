export type DeepKeys<T> = T extends object
    ? {
          [K in keyof T]: K | DeepKeys<T[K]>
      }[keyof T]
    : never

export type FlattenKeys<T, Prefix extends string = ''> = T extends object
    ? {
          [K in keyof T]: T[K] extends object ? FlattenKeys<T[K], `${Prefix}${K & string}.`> : `${Prefix}${K & string}`
      }[keyof T]
    : never

export type FlattenObject<T> = {
    [K in FlattenKeys<T>]: K extends `${infer Prefix}.${infer Suffix}`
        ? T[Prefix & keyof T] extends object
            ? FlattenObject<T[Prefix & keyof T]>[Suffix & keyof FlattenObject<T[Prefix & keyof T]>]
            : never
        : T[K & keyof T]
}

export type DeepKeyValues<T extends readonly object[]> = {
    [K in keyof T]: T[K] extends { key: infer U }
        ? U extends string
            ? T[K] extends { children: infer C }
                ? C extends readonly object[]
                    ? U | DeepKeyValues<C>
                    : never
                : U
            : never
        : never
}[number]

/* from vue runtime core */
type NotUndefined<T> = T extends undefined ? never : T

export type NativeType = null | number | string | boolean | symbol

type InferDefault<P, T> =
    // eslint-disable-next-line @typescript-eslint/ban-types
    ((props: P) => T & {}) | (T extends NativeType ? T : never) | (T extends (...args: any[]) => any ? T : never)

export type InferDefaults<T> = {
    [K in keyof T]?: InferDefault<T, T[K]>
}

export type PropsWithDefaults<T, Defaults extends InferDefaults<T>, BKeys extends keyof T> = Omit<T, keyof Defaults> & {
    [K in keyof Defaults]-?: K extends keyof T ? (Defaults[K] extends undefined ? T[K] : NotUndefined<T[K]>) : never
} & {
    readonly [K in BKeys]-?: boolean
}
