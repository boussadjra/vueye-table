import type { TableColumn, TableRow } from "@vueye-table/core";
import { inject, provide, type InjectionKey, type PropType } from "vue";

/** Leading native utility cells, independent of data-column coordinates. */
export const columnLayoutProps = {
  leadingColumns: { type: Number, default: 0 },
} as const;
const columnOffsetKey: InjectionKey<() => number> = Symbol("vt-leading-columns");
export function provideColumnOffset(offset: () => number): void {
  provide(columnOffsetKey, offset);
}
export function injectColumnOffset(): () => number {
  return inject(columnOffsetKey, () => 0);
}

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
