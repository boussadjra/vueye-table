export type DeepKeys<T> = T extends object
    ? {
          [K in keyof T]: K | DeepKeys<T[K]>
      }[keyof T]
    : never

export type Prefix<T extends object, P extends string> = {
    [key in keyof T as `${P}${string & key}`]: T[key]
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
