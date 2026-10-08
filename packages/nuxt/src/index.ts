import { addComponent, addImports, defineNuxtModule } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";

/** Options under `vueyeTable` in `nuxt.config`. */
export interface ModuleOptions {
  /** Add the styled theme to every page. Defaults to `true`. */
  readonly css: boolean;
  /** Register `<VueyeTable>` and `<VueyeGrid>`. Defaults to `true`. */
  readonly components: boolean;
  /**
   * Also register the headless (`DataTable*`, `DataGrid*`) and styled (`Vt*`) components, for
   * building custom tables. Defaults to `false`.
   */
  readonly layers: boolean;
  /** Auto-import `useDataTable`, `useDataGrid`, and `defineColumns`. Defaults to `true`. */
  readonly composables: boolean;
}

const fullComponents = ["VueyeTable", "VueyeGrid"] as const;

const layerComponents = [
  "DataTableRoot",
  "DataTableViewport",
  "DataTableVirtualColumns",
  "DataTableCaption",
  "DataTableHeader",
  "DataTableHeaderRow",
  "DataTableHeaderCell",
  "DataTableSortButton",
  "DataTableBody",
  "DataTableRow",
  "DataTableCell",
  "DataTableEmpty",
  "DataTableSelectAll",
  "DataTableSelectRow",
  "DataTableSearch",
  "DataTablePagination",
  "DataTablePageSize",
  "DataTableColumnVisibility",
  "DataTableStatus",
  "DataTableLoadMore",
  "DataTableExpandToggle",
  "DataTableDetailRow",
  "DataTableTreeCell",
  "DataGridRoot",
  "DataGridBody",
  "DataGridCell",
  "VtTable",
  "VtHeader",
  "VtBody",
  "VtEmpty",
  "VtSearch",
  "VtPageSize",
  "VtPagination",
  "VtStatus",
  "VtLoadMore",
  "VtExpandToggle",
  "VtDetailRow",
  "VtTreeCell",
  "VtToolbar",
  "VtColumnVisibility",
  "VtSortIndicator",
  "VtGrid",
] as const;

const composables = ["useDataTable", "useDataGrid", "defineColumns"] as const;

/**
 * Registers vueye-table in a Nuxt application. Components are imported where they are used, so
 * pages that render no table load none of it. Every table is created inside a component, so no
 * state is shared between requests.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@vueye-table/nuxt",
    configKey: "vueyeTable",
    compatibility: { nuxt: ">=4.0.0" },
  },
  defaults: {
    css: true,
    components: true,
    layers: false,
    composables: true,
  },
  setup(options: ModuleOptions, nuxt: Nuxt) {
    if (options.css) {
      nuxt.options.css.push("vueye-table/style.css");
    }
    const names = [
      ...(options.components ? fullComponents : []),
      ...(options.layers ? layerComponents : []),
    ];
    for (const name of names) {
      addComponent({ name, export: name, filePath: "vueye-table" });
    }
    if (options.composables) {
      addImports(composables.map((name) => ({ name, from: "vueye-table" })));
    }
  },
});
