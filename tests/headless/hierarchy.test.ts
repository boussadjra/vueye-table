import {
  DataGridRoot,
  DataTableRoot,
  DataTableBody,
  DataTableCell,
  DataTableRow,
  DataTableExpandToggle,
  DataTableSelectRow,
  DataTableStatus,
  DataTableViewport,
} from "@vueye-table/headless";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { mountWithTable } from "../helpers";
import { deferred, settleSource } from "../streaming-helpers";

interface Row {
  id: number | string;
  name: string;
  children?: readonly Row[];
}
const columns = [{ id: "name" as const }, { id: "id" as const }];
const data: Row[] = [
  {
    id: 1,
    name: "Folder",
    children: [
      { id: 2, name: "Child" },
      { id: 3, name: "Other" },
    ],
  },
  { id: "1", name: "Second folder", children: [{ id: 4, name: "Second child" }] },
];

describe("headless hierarchy", () => {
  it.each([false, true])(
    "links details, defers mounting and respects keepAliveDetail=%s",
    async (keepAliveDetail) => {
      let mounts = 0;
      const Detail = defineComponent({
        setup() {
          mounts++;
          const count = ref(0);
          return () => h("button", { onClick: () => count.value++ }, `Count ${count.value}`);
        },
      });
      const { wrapper, table: getTable } = mountWithTable(
        { data, columns, getRowCanExpand: () => true },
        (table) =>
          h(DataTableRoot, { table, keepAliveDetail }, () =>
            h(
              DataTableBody,
              { colspan: table.columns.length + 1 },
              {
                row: ({ row }: { row: (typeof table.rows)[number] }) =>
                  h(DataTableRow, { key: row.key, row }, () => [
                    h("td", [h(DataTableExpandToggle, { row })]),
                    ...table.columns.map((column) =>
                      h(DataTableCell, { key: column.id, row, column }),
                    ),
                  ]),
                detail: () => h(Detail),
              },
            ),
          ),
      );
      expect(mounts).toBe(0);
      await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
      const id = wrapper.findAll("[data-expand-toggle]")[0]!.attributes("aria-controls");
      expect(wrapper.get("[data-detail]").attributes("id")).toBe(id);
      expect(wrapper.get("[data-detail] td").attributes("colspan")).toBe("3");
      await wrapper.get("[data-detail] button").trigger("click");
      getTable().toggleColumn("id", false);
      await nextTick();
      expect(wrapper.get("[data-detail] td").attributes("colspan")).toBe("2");
      await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
      expect(wrapper.find("[data-detail]").exists()).toBe(keepAliveDetail);
      expect(wrapper.find("[data-detail][hidden]").exists()).toBe(keepAliveDetail);
      await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
      expect(wrapper.get("[data-detail] button").text()).toBe(
        keepAliveDetail ? "Count 1" : "Count 0",
      );
      expect(mounts).toBe(keepAliveDetail ? 1 : 2);
      await wrapper.findAll("[data-expand-toggle]")[1]!.trigger("click");
      expect(
        new Set(wrapper.findAll("[data-detail]").map((row) => row.attributes("id"))).size,
      ).toBe(2);
      wrapper.unmount();
    },
  );
  it("uses row-focused tree keyboard navigation and loaded tri-state selection", async () => {
    const { wrapper, table: getTable } = mountWithTable(
      { data, columns, getChildren: (row) => row.children, paginate: false },
      (table) =>
        h(DataTableRoot, { table }, () =>
          h(DataTableBody, null, {
            row: ({ row }: { row: (typeof table.rows)[number] }) =>
              h(DataTableRow, { key: row.key, row }, () => [
                h("td", [h(DataTableSelectRow, { row })]),
                ...table.columns.map((column) => h(DataTableCell, { key: column.id, row, column })),
              ]),
          }),
        ),
      document.body,
    );
    expect(wrapper.get("table").attributes("role")).toBe("treegrid");
    const first = wrapper.get('tr[data-key="1"]');
    expect(first.attributes("aria-level")).toBe("1");
    expect(first.attributes("aria-setsize")).toBe("2");
    expect(first.attributes("aria-posinset")).toBe("1");
    await first.trigger("keydown", { key: "ArrowRight" });
    expect(getTable().rows).toHaveLength(4);
    expect(wrapper.get("table").attributes("aria-rowcount")).toBe("5");
    await first.trigger("keydown", { key: "ArrowRight" });
    expect((document.activeElement as HTMLElement).dataset["key"]).toBe("2");
    expect(wrapper.get('tr[data-key="2"]').attributes("aria-level")).toBe("2");
    getTable().select([2]);
    await nextTick();
    expect((wrapper.get('tr[data-key="1"] input').element as HTMLInputElement).indeterminate).toBe(
      true,
    );
    await wrapper.get('tr[data-key="2"]').trigger("keydown", { key: "ArrowLeft" });
    expect((document.activeElement as HTMLElement).dataset["key"]).toBe("1");
    await first.trigger("keydown", { key: "ArrowLeft" });
    expect(getTable().rows).toHaveLength(2);
    await first.trigger("keydown", { key: "*" });
    expect(getTable().rows).toHaveLength(5);
    await wrapper.get('tr[data-key="2"]').trigger("focus");
    getTable().toggleExpanded(1, false);
    await nextTick();
    expect(wrapper.findAll('tbody tr[tabindex="0"]')).toHaveLength(1);
    expect(wrapper.get('tbody tr[tabindex="0"]').attributes("data-key")).toBe("1");
    wrapper.unmount();
  });
  it.each([DataTableRoot, DataGridRoot])(
    "announces lazy loading and restores focus after inline retry",
    async (Root) => {
      const first = deferred<readonly Row[]>();
      let signal: AbortSignal | undefined;
      let calls = 0;
      const loader = vi.fn<(row: unknown, signal: AbortSignal) => Promise<readonly Row[]>>(
        (_row: unknown, nextSignal: AbortSignal): Promise<readonly Row[]> => {
          signal = nextSignal;
          return ++calls === 1 ? first.promise : Promise.resolve([{ id: 9, name: "Loaded" }]);
        },
      );
      const { wrapper, table: getTable } = mountWithTable<Row>(
        { data: [{ id: 1, name: "Lazy" }], columns, hasChildren: () => true, loadChildren: loader },
        (table) => h("div", [h(Root, { table }), h(DataTableStatus)]),
        document.body,
      );
      await wrapper.get("[data-expand-toggle]").trigger("click");
      await settleSource();
      expect(wrapper.text()).toContain("Loading children…");
      first.reject(new Error("Offline"));
      await settleSource();
      expect(wrapper.get('[role="status"]').text()).toContain("Could not load children.");
      await wrapper.get(".vt-tree-retry").trigger("click");
      await settleSource();
      expect(wrapper.text()).toContain("Loaded");
      expect(loader).toHaveBeenCalledTimes(2);
      expect(document.activeElement).toBe(
        wrapper.get(Root === DataGridRoot ? "table" : 'tr[data-key="1"]').element,
      );
      expect(signal?.aborted).toBe(false);
      getTable().toggleExpanded(1, false);
      await nextTick();
      expect(wrapper.text()).not.toContain("Loaded");
      wrapper.unmount();
    },
  );
  it.each(["collapse", "dispose"])(
    "aborts pending children on %s and ignores late results",
    async (action) => {
      const pending = deferred<readonly Row[]>();
      let signal: AbortSignal | undefined;
      const { wrapper, table: getTable } = mountWithTable<Row>(
        {
          data: [{ id: 1, name: "Lazy" }],
          columns,
          hasChildren: () => true,
          loadChildren: (_row, nextSignal) => {
            signal = nextSignal;
            return pending.promise;
          },
        },
        (table) => h(DataTableRoot, { table }),
      );
      await wrapper.get("[data-expand-toggle]").trigger("click");
      await settleSource();
      expect(signal?.aborted).toBe(false);
      if (action === "collapse") getTable().toggleExpanded(1, false);
      else wrapper.unmount();
      expect(signal?.aborted).toBe(true);
      pending.resolve([{ id: 9, name: "Stale child" }]);
      await settleSource();
      expect(getTable().getRow(9)).toBeUndefined();
      if (action === "collapse") wrapper.unmount();
    },
  );
  it("maps cell-focused tree keys in grids while other columns retain spreadsheet movement", async () => {
    const { wrapper, table: getTable } = mountWithTable(
      { data, columns, getChildren: (row) => row.children, paginate: false },
      (table) => h(DataGridRoot, { table, treeColumn: "name" }),
    );
    const grid = wrapper.get('[role="treegrid"]');
    await grid.trigger("keydown", { key: "ArrowRight" });
    expect(getTable().rows).toHaveLength(4);
    await grid.trigger("keydown", { key: "ArrowRight" });
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r1-c0$/u);
    await grid.trigger("keydown", { key: "ArrowLeft" });
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r0-c0$/u);
    await grid.trigger("keydown", { key: "Tab" });
    await grid.trigger("keydown", { key: "ArrowRight" });
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r0-c1$/u);
    wrapper.unmount();
  });
  it("renders virtual details and retains collapsed content without a layout item", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { wrapper, table: getTable } = mountWithTable(
      {
        data: Array.from({ length: 50 }, (_, id) => ({ id, name: `Row ${id}` })),
        columns,
        getRowCanExpand: () => true,
        paginate: false,
      },
      (table) =>
        h(DataTableViewport, { height: "120px" }, () =>
          h(DataTableRoot, { table, virtual: true, rowHeight: 40, keepAliveDetail: true }, () =>
            h(DataTableBody, null, { detail: () => h("input", { value: "Retained" }) }),
          ),
        ),
    );
    const scroll = wrapper.get("[data-virtual-viewport]").element;
    Object.defineProperty(scroll, "clientHeight", { configurable: true, value: 120 });
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    getTable().toggleExpanded(0, true);
    await nextTick();
    expect(wrapper.find("[data-detail]").exists()).toBe(true);
    getTable().toggleExpanded(0, false);
    await nextTick();
    expect(wrapper.get("[data-detail]").attributes("hidden")).toBeDefined();
    expect(getTable().renderItems.some((item) => item.kind === "detail")).toBe(false);
    wrapper.unmount();
  });
});
