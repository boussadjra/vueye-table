/**
 * Dotted property paths.
 *
 * A column addresses nested data with a path such as `"address.city"`. The types below give every
 * such path its value type, and the functions read and write through a path without mutating.
 */

type Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | readonly unknown[]
  | ((...args: never[]) => unknown);

type Depth = [never, 0, 1, 2, 3];

/** Every dotted path into `T`, four levels deep. Arrays, dates, and functions are leaves. */
export type DeepKeys<T, TDepth extends number = 4> = [TDepth] extends [never]
  ? never
  : T extends Leaf
    ? never
    : {
        [K in keyof T & string]:
          | K
          | (NonNullable<T[K]> extends Leaf
              ? never
              : `${K}.${DeepKeys<NonNullable<T[K]>, Depth[TDepth]>}`);
      }[keyof T & string];

/** The value found at `TPath` in `T`. A nullable step makes the result possibly `undefined`. */
export type PathValue<T, TPath extends string> = TPath extends `${infer THead}.${infer TRest}`
  ? THead extends keyof T
    ? PathValue<NonNullable<T[THead]>, TRest> | (undefined extends T[THead] ? undefined : never)
    : undefined
  : TPath extends keyof T
    ? T[TPath]
    : undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Read the value at a dotted path, or `undefined` when a step is missing. */
export function getPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

/**
 * Return a copy of `source` with `value` at `path`. Only the objects along the path are copied;
 * everything else is shared. Missing steps are created as plain objects.
 */
export function setPath<T>(source: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  const base: Record<string, unknown> = isRecord(source) ? { ...source } : {};
  if (head === undefined) {
    return source;
  }
  base[head] = rest.length === 0 ? value : setPath(base[head], rest.join("."), value);
  return base as T;
}
