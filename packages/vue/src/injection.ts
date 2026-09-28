import { inject, provide, type InjectionKey } from "vue";

import type { DataGridBinding } from "./use-data-grid";
import type { DataTableBinding } from "./use-data-table";

const tableKey: InjectionKey<DataTableBinding<unknown>> = Symbol("vueye-table");
const gridKey: InjectionKey<DataGridBinding<unknown>> = Symbol("vueye-table-grid");

/** Make a table available to every component below the current one. */
export function provideDataTable<TRow>(table: DataTableBinding<TRow>): void {
  provide(tableKey, table as DataTableBinding<unknown>);
}

/**
 * Read the table provided by an ancestor. Throws when there is none, naming the component that
 * provides one, rather than rendering an empty table.
 */
export function injectDataTable<TRow = unknown>(
  consumer = "This component",
): DataTableBinding<TRow> {
  const table = inject(tableKey, undefined);
  if (!table) {
    throw new Error(
      `${consumer} needs a table. Render it inside <DataTableRoot :table="table">, or call provideDataTable(useDataTable(...)) in an ancestor.`,
    );
  }
  return table as DataTableBinding<TRow>;
}

export function provideDataGrid<TRow>(grid: DataGridBinding<TRow>): void {
  provide(gridKey, grid as DataGridBinding<unknown>);
}

/** Read the grid provided by an ancestor, or `undefined` outside a grid. */
export function injectDataGrid<TRow = unknown>(): DataGridBinding<TRow> | undefined {
  return inject(gridKey, undefined) as DataGridBinding<TRow> | undefined;
}
