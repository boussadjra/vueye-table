import type { TableColumn, TableRow } from "@vueye-table/core";
import type { PropType } from "vue";

/** The element a component renders. Every headless component accepts `as`. */
export const asProp = (tag: string) =>
  ({
    type: String,
    default: tag,
  }) as const;

/** Columns of any row type; callbacks on a column make `TableColumn<unknown>` too narrow. */
export type AnyTableColumn = TableColumn<any>;

export const columnProp = {
  type: Object as PropType<AnyTableColumn>,
  required: true,
} as const;

export const rowProp = {
  type: Object as PropType<TableRow<unknown>>,
  required: true,
} as const;

/** `data-*` attributes take strings; `undefined` leaves the attribute off. */
export function flag(value: boolean): "" | undefined {
  return value ? "" : undefined;
}
