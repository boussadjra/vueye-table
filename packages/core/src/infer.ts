import type { ColumnDef } from "./column";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function collect(value: unknown, prefix: string, depth: number, into: Set<string>): void {
  if (!isPlainObject(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (isPlainObject(child) && depth < 4) {
      collect(child, path, depth + 1, into);
    } else {
      into.add(path);
    }
  }
}

/**
 * Columns for data that has none declared: one path column per leaf of the first `sample` rows,
 * nested objects flattened into dotted paths, in first-seen order.
 */
export function inferColumns<TRow>(rows: readonly TRow[], sample = 20): readonly ColumnDef<TRow>[] {
  const paths = new Set<string>();
  for (const row of rows.slice(0, sample)) {
    collect(row, "", 1, paths);
  }
  return Object.freeze([...paths].map((id) => ({ id }) as ColumnDef<TRow>));
}
