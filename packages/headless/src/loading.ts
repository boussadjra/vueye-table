import { injectDataTable, type AnyDataTableBinding } from "@vueye-table/vue";
import { defineComponent, h, type VNode } from "vue";

/** Keep this visual sentinel out of the live region and logical data-row count. */
export function loadSentinel(table: AnyDataTableBinding, colspan: number): VNode | undefined {
  return table.loadingMode === "cursor" &&
    table.loadedRowCount > 0 &&
    (table.loadState === "loading" || table.loadState === "streaming")
    ? h("tr", { key: "vt-load-sentinel", "data-load-sentinel": "", "aria-hidden": "true" }, [
        h("td", { colspan: Math.max(1, colspan), class: "vt-load-sentinel" }, "Loading more rows…"),
      ])
    : undefined;
}

/** A keyboard-accessible alternative to automatic virtual-end loading, with error recovery. */
export const DataTableLoadMore = defineComponent({
  name: "DataTableLoadMore",
  props: {
    label: { type: String, default: "Load more rows" },
    retryLabel: { type: String, default: "Retry loading" },
    loadingLabel: { type: String, default: "Loading rows…" },
  },
  setup(props) {
    const table = injectDataTable("<DataTableLoadMore>");
    return () =>
      table.loadState === "error"
        ? h("button", { type: "button", onClick: () => table.retry() }, props.retryLabel)
        : table.loadingMode === "cursor" && table.loadState !== "done"
          ? h(
              "button",
              {
                type: "button",
                disabled: !table.canLoadMore,
                onClick: () => {
                  void table.loadNext();
                },
              },
              table.loadState === "loading" || table.loadState === "streaming"
                ? props.loadingLabel
                : props.label,
            )
          : null;
  },
});
