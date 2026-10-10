import { tableLocaleKey, type TableLocaleOptions } from "@vueye-table/vue";
import type { App, Plugin } from "vue";

import { VueyeGrid } from "./vueye-grid";
import { VueyeTable } from "./vueye-table";

/** Options of `VueyeTablePlugin`: the application's language, which every table speaks. */
export type VueyeTablePluginOptions = TableLocaleOptions;

/**
 * Register `<VueyeTable>` and `<VueyeGrid>` globally. A `locale` and `messages` given here are
 * the default of every table in the application; a table's own props win over them.
 */
export const VueyeTablePlugin: Plugin<[VueyeTablePluginOptions?]> = {
  install(app: App, options?: VueyeTablePluginOptions): void {
    app.component("VueyeTable", VueyeTable);
    app.component("VueyeGrid", VueyeGrid);
    if (options?.locale !== undefined || options?.messages !== undefined) {
      const language: TableLocaleOptions = { locale: options.locale, messages: options.messages };
      app.provide(tableLocaleKey, () => language);
    }
  },
};
