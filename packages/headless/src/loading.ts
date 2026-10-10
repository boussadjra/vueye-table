import {
  injectDataTable,
  useTableLocale,
  type AnyDataTableBinding,
  type TableLocale,
} from "@vueye-table/vue";
import { defineComponent, h, type PropType, type VNode } from "vue";

/** Keep this visual sentinel out of the live region and logical data-row count. */
export function loadSentinel(
  table: AnyDataTableBinding,
  colspan: number,
  locale?: TableLocale,
): VNode | undefined {
  return table.loadingMode === "cursor" &&
    table.loadedRowCount > 0 &&
    (table.loadState === "loading" || table.loadState === "streaming")
    ? h("tr", { key: "vt-load-sentinel", "data-load-sentinel": "", "aria-hidden": "true" }, [
        h(
          "td",
          { colspan: Math.max(1, colspan), class: "vt-load-sentinel" },
          locale?.messages.loadingMoreRows ?? "Loading more rows…",
        ),
      ])
    : undefined;
}

/** A keyboard-accessible alternative to automatic virtual-end loading, with error recovery. */
export const DataTableLoadMore = defineComponent({
  name: "DataTableLoadMore",
  props: {
    label: { type: String as PropType<string | undefined>, default: undefined },
    retryLabel: { type: String as PropType<string | undefined>, default: undefined },
    loadingLabel: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props) {
    const table = injectDataTable("<DataTableLoadMore>");
    const locale = useTableLocale();
    return () =>
      table.loadState === "error"
        ? h(
            "button",
            { type: "button", onClick: () => table.retry() },
            props.retryLabel ?? locale().messages.retryLoading,
          )
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
                ? (props.loadingLabel ?? locale().messages.loadingRows)
                : (props.label ?? locale().messages.loadMoreRows),
            )
          : null;
  },
});
