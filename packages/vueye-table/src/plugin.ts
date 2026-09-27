import type { App, Plugin } from "vue";

import { VueyeGrid } from "./vueye-grid";
import { VueyeTable } from "./vueye-table";

/** Register `<VueyeTable>` and `<VueyeGrid>` globally. */
export const VueyeTablePlugin: Plugin = {
  install(app: App): void {
    app.component("VueyeTable", VueyeTable);
    app.component("VueyeGrid", VueyeGrid);
  },
};
