import type { TableRow } from "@vueye-table/core";
import type { StyleValue } from "vue";

/** A class as Vue reads it: a string, an object of flags, or a list of either. */
export type RowClass =
  | string
  | Readonly<Record<string, boolean>>
  | ReadonlyArray<string | Readonly<Record<string, boolean>>>;

/**
 * What a page may put on a body row: a class, a style, and `data-*` and `aria-*` attributes. The
 * row's own attributes (`data-key`, `data-selected`, `aria-rowindex`, tree attributes, focus) win
 * on a collision, and anything else, event handlers included, is left out.
 */
export interface RowAttributes {
  readonly class?: RowClass;
  readonly style?: StyleValue;
  readonly [attribute: `data-${string}`]: string | number | boolean | undefined;
  readonly [attribute: `aria-${string}`]: string | number | boolean | undefined;
}

/** The attributes of a body row, read from its item on each render. */
export type RowAttrs<T> = (item: T, row: TableRow<T>) => RowAttributes | null | undefined;

/** Accepts row attributes of any row type, as components accept any row. */
export type AnyRowAttrs = RowAttrs<any>;

function accepted(name: string): boolean {
  return (
    name === "class" || name === "style" || name.startsWith("data-") || name.startsWith("aria-")
  );
}

/**
 * The attributes `attrs` gives `row`, keeping only a class, a style, and `data-*` and `aria-*`
 * attributes. Merge them before the row's own so the row's win.
 */
export function rowAttributes(
  attrs: AnyRowAttrs | undefined,
  row: TableRow<unknown>,
): Record<string, unknown> {
  const given = attrs?.(row.original, row);
  if (!given) return {};
  const kept: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(given)) if (accepted(name)) kept[name] = value;
  return kept;
}
