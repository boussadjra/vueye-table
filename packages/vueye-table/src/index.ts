export * from "@vueye-table/core";
export * from "@vueye-table/headless";
export * from "@vueye-table/styled";
export * from "@vueye-table/vue";
export { VueyeTablePlugin } from "./plugin";
export { VueyeGrid } from "./vueye-grid";
export { VueyeTable, type CellSlotProps, type StatusSlotProps } from "./vueye-table";

import type { VueyeGrid } from "./vueye-grid";
import type { VueyeTable } from "./vueye-table";

declare module "vue" {
  export interface GlobalComponents {
    VueyeTable: typeof VueyeTable;
    VueyeGrid: typeof VueyeGrid;
  }
}
