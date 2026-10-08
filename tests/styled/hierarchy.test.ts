import { VtGrid, VtTable } from "@vueye-table/styled";
import { describe, expect, it } from "vitest";
import { h, nextTick } from "vue";

import { mountWithTable } from "../helpers";
interface Row {
  id: number;
  name: string;
  children?: readonly Row[];
}

describe("styled hierarchy", () => {
  it.each([VtTable, VtGrid])(
    "uses shared disclosure icons, hierarchy and detail surfaces",
    async (Component) => {
      const { wrapper, table: getTable } = mountWithTable<Row>(
        {
          data: [{ id: 1, name: "Parent", children: [{ id: 2, name: "Child" }] }],
          columns: [{ id: "name" }],
          getChildren: (row) => row.children,
          getRowCanExpand: () => true,
        },
        (table) =>
          h(
            Component,
            { table, treeColumn: "name", theme: "dark", keepAliveDetail: true },
            { expanded: () => h("input", { value: "Detail" }) },
          ),
      );
      expect(wrapper.get(".vt-expand-toggle svg").attributes("aria-hidden")).toBe("true");
      getTable().toggleExpanded(1, true);
      await nextTick();
      expect(wrapper.find(".vt-detail-cell").exists()).toBe(true);
      expect(wrapper.findAll("[data-tree-cell]")).toHaveLength(2);
      expect(wrapper.get(".vt-surface").attributes("data-vt-theme")).toBe("dark");
      getTable().toggleExpanded(1, false);
      await nextTick();
      expect(wrapper.get("[data-detail]").attributes("hidden")).toBeDefined();
      wrapper.unmount();
    },
  );
});
