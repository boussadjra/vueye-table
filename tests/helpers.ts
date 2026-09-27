import { mount, type VueWrapper } from "@vue/test-utils";
import {
  provideDataTable,
  useDataTable,
  type DataTableBinding,
  type UseDataTableOptions,
} from "@vueye-table/vue";
import { defineComponent, h, type Component, type VNodeChild } from "vue";

/** Mount a render function with a table created inside the component. */
export function mountWithTable<TRow>(
  options: UseDataTableOptions<TRow>,
  render: (table: DataTableBinding<TRow>) => VNodeChild,
  attachTo?: HTMLElement,
): { wrapper: VueWrapper; table: () => DataTableBinding<TRow> } {
  let table: DataTableBinding<TRow> | undefined;
  const Host: Component = defineComponent({
    setup() {
      table = useDataTable(options);
      provideDataTable(table);
      return () => h("div", render(table as DataTableBinding<TRow>) as never);
    },
  });
  const wrapper = mount(Host, attachTo ? { attachTo } : {});
  return { wrapper, table: () => table as DataTableBinding<TRow> };
}
