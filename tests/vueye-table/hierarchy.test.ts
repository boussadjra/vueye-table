import { flushPromises, mount } from "@vue/test-utils";
import type { TableRow } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { VueyeGrid, VueyeTable } from "vueye-table";

interface Row {
  id: number;
  name: string;
  children?: readonly Row[];
}
const columns = [
  { id: "name", header: "Name" },
  { id: "id", header: "ID" },
];
const data: Row[] = [
  { id: 1, name: "Folder", children: [{ id: 2, name: "<img src=x onerror=alert(1)>" }] },
  { id: 3, name: "Other folder", children: [{ id: 4, name: "Other child" }] },
];

describe("full hierarchy components", () => {
  it.each([VueyeTable, VueyeGrid])(
    "applies mounted treeFilter changes while retaining lazy children and expansion",
    async (Component) => {
      const input = Object.freeze([Object.freeze({ id: 1, name: "Warehouse" })]);
      const load = vi
        .fn<() => Promise<readonly Row[]>>()
        .mockResolvedValue([{ id: 2, name: "Needle bin" }]);
      const wrapper = mount(Component, {
        props: {
          data: input,
          columns,
          hasChildren: (row: Row) => row.id === 1,
          loadChildren: load,
          expanded: [1],
          selected: [2],
          selectable: true,
          paginate: false,
          treeFilter: "ancestors",
          toolbar: false,
        },
      });
      await flushPromises();
      await wrapper.setProps({ search: "Needle" });
      const renderedKeys = () =>
        wrapper.findAll("tbody tr[data-key]").map((row) => row.attributes("data-key"));
      expect(renderedKeys()).toEqual(["1", "2"]);
      await wrapper.setProps({ treeFilter: "strict" });
      expect(renderedKeys()).toEqual(["2"]);
      await wrapper.setProps({ treeFilter: "descendants", search: "Warehouse" });
      expect(renderedKeys()).toEqual(["1", "2"]);
      await wrapper.setProps({ treeFilter: "ancestors" });
      expect(renderedKeys()).toEqual(["1"]);
      await wrapper.setProps({ search: "" });
      expect(renderedKeys()).toEqual(["1", "2"]);
      expect(wrapper.get('tr[data-key="2"]').attributes("aria-selected")).toBe(
        Component === VueyeTable ? "true" : undefined,
      );
      expect(load).toHaveBeenCalledTimes(1);
      expect(input).toEqual([{ id: 1, name: "Warehouse" }]);
      wrapper.unmount();
    },
  );
  it.each([VueyeTable, VueyeGrid])(
    "forwards tree input, controlled expansion and expand/collapse events",
    async (Component) => {
      const expanded = ref<readonly (number | string)[]>([]);
      const events: boolean[] = [];
      const Host = defineComponent({
        setup() {
          return () =>
            h(Component, {
              data,
              columns,
              getChildren: (row: Row) => row.children,
              treeColumn: "name",
              expanded: expanded.value,
              "onUpdate:expanded": (keys: true | readonly (number | string)[]) => {
                expanded.value = keys === true ? [1, 3] : keys;
              },
              onExpand: (_item: unknown, row: TableRow<unknown>) => events.push(row.isExpanded),
              onCollapse: (_item: unknown, row: TableRow<unknown>) => events.push(row.isExpanded),
              searchable: false,
              columnToggle: false,
              toolbar: false,
              editable: false,
            });
        },
      });
      const wrapper = mount(Host);
      expect(wrapper.get("table").attributes("role")).toBe("treegrid");
      await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
      expect(expanded.value).toEqual([1]);
      expect(wrapper.text()).toContain("<img src=x onerror=alert(1)>");
      expect(wrapper.find("img").exists()).toBe(false);
      expect(wrapper.get('tr[data-key="2"]').attributes("aria-level")).toBe("2");
      expect(wrapper.get("table").attributes("aria-rowcount")).toBe("4");
      expect(wrapper.findAll("tbody tr[data-key]").at(-1)?.attributes("aria-rowindex")).toBe("4");
      await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
      expect(events).toEqual([true, false]);
      expect(expanded.value).toEqual([]);
      wrapper.unmount();
    },
  );
  it("inserts details without rerendering unrelated cell slots and spans changed columns", async () => {
    const renders = new Map<number, number>();
    const wrapper = mount(VueyeTable, {
      props: {
        data,
        columns,
        rowCanExpand: () => true,
        selectable: true,
        searchable: false,
        columnToggle: false,
      },
      slots: {
        "cell.name": ({ row, display }: { row: TableRow<unknown>; display: string }) => {
          const id = row.key as number;
          renders.set(id, (renders.get(id) ?? 0) + 1);
          return display;
        },
        expanded: ({ row }: { row: TableRow<unknown> }) => h("p", `Detail ${row.key}`),
      },
    });
    const initialOther = renders.get(3);
    await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
    expect(wrapper.get("[data-detail] td").attributes("colspan")).toBe("4");
    expect(renders.get(3)).toBe(initialOther);
    expect(wrapper.get("table").attributes("role")).not.toBe("treegrid");
    await wrapper.setProps({ hiddenColumns: ["id"] });
    expect(wrapper.get("[data-detail] td").attributes("colspan")).toBe("3");
    wrapper.unmount();
  });
  it("keeps unchanged tree cell slots and node identities when another branch expands", async () => {
    const render = vi.fn<(props: { display: string }) => string>(({ display }) => display);
    const wrapper = mount(VueyeTable, {
      props: {
        data,
        columns,
        getChildren: (row: Row) => row.children,
        searchable: false,
        columnToggle: false,
      },
      slots: { "cell.name": render },
    });
    const other = wrapper.get('tr[data-key="3"]').element;
    const initial = render.mock.calls.filter(([cell]) => cell.display === "Other folder").length;
    await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
    expect(wrapper.get('tr[data-key="3"]').element).toBe(other);
    expect(render.mock.calls.filter(([cell]) => cell.display === "Other folder").length).toBe(
      initial,
    );
    wrapper.unmount();
  });
  it("renders grid details outside its editable coordinates and preserves unrelated slots", async () => {
    const render = vi.fn<(props: { display: string }) => string>(({ display }) => display);
    const wrapper = mount(VueyeGrid, {
      props: { data, columns, rowCanExpand: () => true, rowNumbers: false, toolbar: false },
      slots: {
        "cell.name": render,
        expanded: ({ row }: { row: TableRow<unknown> }) => h("p", `Detail ${row.key}`),
      },
    });
    await wrapper.findAll("[data-expand-toggle]")[0]!.trigger("click");
    expect(wrapper.get("[data-detail] td").attributes("colspan")).toBe("3");
    expect(render.mock.calls.filter(([cell]) => cell.display === "Other folder")).toHaveLength(1);
    expect(wrapper.get("[role=grid]").attributes("aria-rowcount")).toBe("3");
    await wrapper.get("[role=grid]").trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.get("[role=grid]").attributes("aria-activedescendant")).toMatch(/-r1-c0$/u);
    wrapper.unmount();
  });
  it.each([VueyeTable, VueyeGrid])(
    "hydrates an initially expanded tree with stable linked ids",
    async (Component) => {
      const Host = {
        render: () =>
          h(Component, {
            data,
            columns,
            getChildren: (row: Row) => row.children,
            expanded: [1],
            searchable: false,
            columnToggle: false,
            toolbar: false,
          }),
      };
      const html = await renderToString(createSSRApp(Host));
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.append(container);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const app = createSSRApp(Host);
      app.mount(container);
      await nextTick();
      expect(warn.mock.calls.flat().join(" ")).not.toContain("Hydration");
      const controls = container.querySelector("[aria-controls]")?.getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      expect(container.ownerDocument.getElementById(controls!)).not.toBeNull();
      app.unmount();
      container.remove();
      warn.mockRestore();
    },
  );
});
