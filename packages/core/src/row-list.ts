/** Read-only array views keep append publication independent of existing list length. */
function indexOf(property: PropertyKey): number | undefined {
  if (typeof property !== "string" || !/^(0|[1-9]\d*)$/u.test(property)) return undefined;
  return Number(property);
}

export function rowList<T>(length: number, read: (index: number) => T): readonly T[] {
  return new Proxy<T[]>([], {
    get(target, property, receiver) {
      if (property === "length") return length;
      const index = indexOf(property);
      return index === undefined
        ? Reflect.get(target, property, receiver)
        : index < length
          ? read(index)
          : undefined;
    },
    has(target, property) {
      const index = indexOf(property);
      return index === undefined ? Reflect.has(target, property) : index < length;
    },
    ownKeys: () => [...Array.from({ length }, (_, index) => String(index)), "length"],
    getOwnPropertyDescriptor(target, property) {
      if (property === "length")
        return { ...Reflect.getOwnPropertyDescriptor(target, property)!, value: length };
      const index = indexOf(property);
      return index === undefined
        ? Reflect.getOwnPropertyDescriptor(target, property)
        : index < length
          ? { configurable: true, enumerable: true, writable: false, value: read(index) }
          : undefined;
    },
    set: () => false,
    deleteProperty: () => false,
    defineProperty: () => false,
    preventExtensions: () => false,
    setPrototypeOf: () => false,
  });
}

interface Chunks<T> {
  readonly chunks: { readonly start: number; readonly rows: readonly T[] }[];
}
const stores = new WeakMap<object, Chunks<unknown>>();

export function appendList<T>(previous: readonly T[], incoming: readonly T[]): readonly T[] {
  if (!incoming.length) return previous;
  let store = stores.get(previous) as Chunks<T> | undefined;
  // A previous view can branch after undo; only extend the current tail in place.
  const last = store?.chunks.at(-1);
  if (!store || (last && last.start + last.rows.length !== previous.length)) {
    store = { chunks: [{ start: 0, rows: previous }] };
  }
  store.chunks.push({ start: previous.length, rows: incoming });
  const chunks = store.chunks;
  const result = rowList(previous.length + incoming.length, (index) => {
    let low = 0;
    let high = chunks.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (chunks[mid]!.start <= index) low = mid;
      else high = mid - 1;
    }
    const chunk = chunks[low]!;
    return chunk.rows[index - chunk.start]!;
  });
  stores.set(result, store);
  return result;
}

export function mapList<T, U>(rows: readonly T[], map: (row: T, index: number) => U): readonly U[] {
  const cache = new Map<number, U>();
  return rowList(rows.length, (index) => {
    if (!cache.has(index)) cache.set(index, map(rows[index]!, index));
    return cache.get(index)!;
  });
}
