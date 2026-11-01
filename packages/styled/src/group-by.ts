import { injectDataTable, useTableLocale } from "@vueye-table/vue";
import { defineComponent, h } from "vue";

import { icon } from "./icons";

/** Choose grouping columns and their outer-to-inner order. */
export const VtGroupBy = defineComponent({
  name: "VtGroupBy",
  setup() {
    const table = injectDataTable("<VtGroupBy>");
    const locale = useTableLocale();
    const move = (index: number, delta: number): void => {
      const order = [...table.grouping];
      const target = index + delta;
      if (target < 0 || target >= order.length) return;
      [order[index], order[target]] = [order[target]!, order[index]!];
      table.groupBy(order);
    };
    return () => {
      const { messages } = locale();
      const available = table.allColumns.filter(
        (column) => column.groupable && !table.grouping.includes(column.id),
      );
      return h(
        "details",
        {
          class: "vt-menu vt-group-by",
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === "Escape") {
              const menu = event.currentTarget as HTMLDetailsElement;
              menu.open = false;
              menu.querySelector("summary")?.focus();
              event.stopPropagation();
            }
          },
        },
        [
          h("summary", { class: "vt-button" }, messages.groupBy),
          h("div", { class: "vt-menu-panel" }, [
            h(
              "select",
              {
                "aria-label": messages.addGroup,
                disabled: !available.length,
                value: "",
                onChange: (event: Event) => {
                  const select = event.target as HTMLSelectElement;
                  if (select.value) table.groupBy([...table.grouping, select.value]);
                  select.value = "";
                },
              },
              [
                h("option", { value: "", disabled: true }, messages.addGroup),
                ...available.map((column) =>
                  h("option", { value: column.id, key: column.id }, column.header),
                ),
              ],
            ),
            h(
              "ol",
              table.grouping.map((id, index) => {
                const name = table.getColumn(id)?.header ?? id;
                const button = (
                  label: string,
                  disabled: boolean,
                  action: () => void,
                  content: ReturnType<typeof h>,
                ) =>
                  h(
                    "button",
                    {
                      type: "button",
                      class: "vt-button",
                      "aria-label": label,
                      disabled,
                      onClick: action,
                    },
                    content,
                  );
                return h("li", { key: id }, [
                  h("span", name),
                  button(
                    messages.moveGroupEarlier(name),
                    index === 0,
                    () => move(index, -1),
                    icon("sortAsc"),
                  ),
                  button(
                    messages.moveGroupLater(name),
                    index === table.grouping.length - 1,
                    () => move(index, 1),
                    icon("sortDesc"),
                  ),
                  button(
                    messages.removeGroup(name),
                    false,
                    () => table.groupBy(table.grouping.filter((column) => column !== id)),
                    h(
                      "svg",
                      { viewBox: "0 0 16 16", class: "vt-icon", "aria-hidden": "true" },
                      h("path", {
                        d: "M4 4l8 8M12 4l-8 8",
                        fill: "none",
                        stroke: "currentColor",
                        "stroke-width": 1.5,
                      }),
                    ),
                  ),
                ]);
              }),
            ),
          ]),
        ],
      );
    };
  },
});
