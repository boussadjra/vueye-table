import { mount } from "@vue/test-utils";
import {
  DataGridRoot,
  DataGridBody,
  DataTableRoot,
  DataTableBody,
  DataTableViewport,
  DataTableRow,
  injectVirtualRenderer,
} from "@vueye-table/headless";
import { useDataTable } from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { mountWithTable } from "../helpers";

const data = Array.from({ length: 100_000 }, (_, id) => ({ id, name: `Row ${id}`, amount: id }));
const columns = Array.from({ length: 24 }, (_, index) => ({
  id: `c${index}`,
  accessor: (row: (typeof data)[number]) => row.name,
  width: 100,
  editable: index === 0,
  setValue: (row: (typeof data)[number], value: unknown) => ({ ...row, name: String(value) }),
}));
function viewport(element: Element, height = 120, width = 200): HTMLElement {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: height },
    clientWidth: { configurable: true, value: width },
  });
  element.dispatchEvent(new Event("scroll"));
  return element as HTMLElement;
}
function fixture(bodyOnly = false, rowCount = data.length) {
  vi.stubGlobal("ResizeObserver", undefined);
  return mountWithTable(
    { data: data.slice(0, rowCount), columns, paginate: false },
    (table) =>
      h(DataTableViewport, { height: "120px" }, () =>
        h(
          DataGridRoot,
          {
            table,
            virtual: !bodyOnly,
            virtualColumns: !bodyOnly,
            rowHeight: 40,
            overscan: 0,
            label: "Virtual grid",
          },
          bodyOnly ? () => h(DataGridBody, { virtual: true, overscan: 0 }) : undefined,
        ),
      ),
    document.body,
  );
}
describe("headless component virtualization", () => {
  it("windows 100k rows and both axes, retains active cells on manual scroll and uses true indices", async () => {
    const { wrapper } = fixture();
    const scroll = viewport(wrapper.get("[data-virtual-viewport]").element);
    await nextTick();
    expect(wrapper.findAll("tbody [data-virtual-row]")).toHaveLength(3);
    expect(wrapper.findAll("tbody [role=gridcell]")).toHaveLength(9);
    const grid = wrapper.get("[role=grid]");
    expect(grid.attributes("aria-rowcount")).toBe("100001");
    expect(grid.attributes("aria-colcount")).toBe("24");
    await grid.trigger("keydown", { key: "End", ctrlKey: true });
    expect(scroll.scrollTop).toBeGreaterThan(3_999_000);
    expect(scroll.scrollLeft).toBeGreaterThan(2000);
    const active = grid.attributes("aria-activedescendant");
    expect(active).toMatch(/-r99999-c23$/u);
    expect(wrapper.get(`#${active}`).attributes("aria-colindex")).toBe("24");
    expect(wrapper.get(`#${active}`).element.parentElement?.getAttribute("aria-rowindex")).toBe(
      "100001",
    );
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(wrapper.find(`#${active}`).exists()).toBe(true);
    expect(wrapper.findAll("tbody [data-virtual-row]").length).toBeLessThanOrEqual(4);
    const headers = wrapper
      .findAll("thead th[data-column]")
      .map((cell) => cell.attributes("data-column"));
    expect(
      wrapper
        .findAll("tbody tr[data-virtual-row]")[0]
        ?.findAll("td[data-column]")
        .map((cell) => cell.attributes("data-column")),
    ).toEqual(headers);
    expect(wrapper.get("tr[data-virtual-spacer]").attributes("aria-hidden")).toBe("true");
    await grid.trigger("keydown", { key: "Home", ctrlKey: true });
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r0-c0$/u);
    await grid.trigger("keydown", { key: "PageDown" });
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r3-c0$/u);
    await grid.trigger("keydown", { key: "PageUp", shiftKey: true });
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r0-c0$/u);
    wrapper.unmount();
  });
  it("keeps an offscreen editor mounted, commits and pastes through the keyed core", async () => {
    const { wrapper, table } = fixture(false, 1000);
    const scroll = viewport(wrapper.get("[data-virtual-viewport]").element);
    await nextTick();
    const grid = wrapper.get("[role=grid]");
    await grid.trigger("keydown", { key: "ArrowDown", ctrlKey: true });
    await grid.trigger("keydown", { key: "Enter" });
    const editor = wrapper.get("input[data-editor]");
    await editor.setValue("Last row changed");
    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(wrapper.get("input[data-editor]").element).toBe(editor.element);
    await editor.trigger("keydown", { key: "Enter" });
    expect(table().rows.at(-1)?.original.name).toBe("Last row changed");
    await grid.trigger("paste", { clipboardData: { getData: () => "Pasted at end" } });
    expect(table().rows.at(-1)?.original.name).toBe("Pasted at end");
    await grid.trigger("keydown", { key: "z", ctrlKey: true });
    expect(table().rows.at(-1)?.original.name).toBe("Last row changed");
    wrapper.unmount();
  });
  it("supports standalone opt-in bodies, details, custom rows and empty slots", async () => {
    const grid = fixture(true, 1000);
    const scroll = viewport(grid.wrapper.get("[data-virtual-viewport]").element);
    await nextTick();
    expect(grid.wrapper.findAll("tbody tr[data-virtual-row]")).toHaveLength(3);
    scroll.scrollTop = 800;
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(grid.wrapper.get("tbody tr[data-virtual-row]").attributes("aria-rowindex")).toBe("22");
    grid.wrapper.unmount();
    const table = mountWithTable(
      {
        data: data.slice(0, 50),
        columns: [{ id: "name" }],
        paginate: false,
        getRowCanExpand: () => true,
        initialState: { expanded: [0] },
      },
      (binding) =>
        h(DataTableViewport, null, () =>
          h(DataTableRoot, { table: binding }, () =>
            h(
              DataTableBody,
              { virtual: { initialCount: 2 }, colspan: 2 },
              {
                detail: ({ row }: { row: { key: string | number } }) => [
                  h("p", `Details ${row.key}`),
                ],
                empty: () => [h("span", "Empty source")],
              },
            ),
          ),
        ),
    );
    viewport(table.wrapper.get("[data-virtual-viewport]").element, 120);
    await nextTick();
    expect(table.wrapper.get("[data-detail]").text()).toBe("Details 0");
    table.table().search("missing");
    await nextTick();
    expect(table.wrapper.get("[data-empty]").text()).toBe("Empty source");
    table.wrapper.unmount();
    const custom = mountWithTable(
      { data: data.slice(0, 25), columns: [{ id: "name" }], paginate: false },
      (binding) =>
        h(DataTableRoot, { table: binding, virtual: { initialCount: 2 } }, () =>
          h(DataTableBody, null, {
            default: ({ rows }: { rows: readonly (typeof binding.rows)[number][] }) =>
              rows.map((row) => h(DataTableRow, { row, key: row.key })),
          }),
        ),
    );
    expect(custom.wrapper.findAll("tbody tr[data-key]")).toHaveLength(2);
    custom.wrapper.unmount();
  });
  it("passes only the virtual slice to custom grid body slots", () => {
    const { wrapper } = mountWithTable(
      { data: data.slice(0, 25), columns: [{ id: "name" }], paginate: false },
      (table) =>
        h(DataGridRoot, { table, virtual: { initialCount: 2 } }, () =>
          h(DataGridBody, null, {
            default: ({ rows }: { rows: readonly (typeof table.rows)[number][] }) =>
              rows.map((row) =>
                h("tr", { "data-custom-row": row.key }, [h("td", row.getValue("name") as string)]),
              ),
          }),
        ),
    );
    expect(wrapper.findAll("tbody [data-custom-row]")).toHaveLength(2);
    expect(wrapper.get("tbody").text()).toBe("Row 0Row 1");
    wrapper.unmount();
  });
  it("renders the same non-virtual markup when omitted or false", async () => {
    const render = async (virtual?: false) =>
      renderToString(
        createSSRApp(
          defineComponent({
            setup() {
              const table = useDataTable({ data: data.slice(0, 3), columns: [{ id: "name" }] });
              return () => h(DataTableRoot, { table, ...(virtual === false ? { virtual } : {}) });
            },
          }),
        ),
      );
    expect(await render(false)).toBe(await render());
  });
  it("server-renders the first slice and hydrates without mismatch", async () => {
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Host = defineComponent({
      setup() {
        const table = useDataTable({ data: data.slice(0, 100), columns, paginate: false });
        return () =>
          h(DataTableViewport, null, () =>
            h(DataGridRoot, {
              table,
              virtual: { initialCount: 3, initialColumnCount: 2 },
              virtualColumns: true,
            }),
          );
      },
    });
    const html = await renderToString(createSSRApp(Host));
    expect(html.match(/data-virtual-row/gu)).toHaveLength(3);
    expect(html.match(/role="gridcell"/gu)).toHaveLength(6);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const app = createSSRApp(Host);
    app.mount(container);
    await nextTick();
    expect(warnings.mock.calls.flat().join(" ")).not.toContain("Hydration");
    app.unmount();
    container.remove();
  });
  it("reports recovered options and exposes renderer layout to custom composition", () => {
    let issues: readonly unknown[] = [];
    const Probe = defineComponent({
      setup() {
        const virtual = injectVirtualRenderer();
        issues = virtual?.rows.issues ?? [];
        return () => (virtual ? h(DataTableBody) : h("span", "No virtual renderer"));
      },
    });
    const { wrapper } = mountWithTable(
      { data: data.slice(0, 12), columns: [{ id: "name" }], paginate: false },
      (table) =>
        h(
          DataTableRoot,
          { table, virtual: { initialCount: -1, rowHeight: -5, overscan: -1 } },
          () => h(Probe),
        ),
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_virtual_option" }),
        expect.objectContaining({ code: "invalid_virtual_size" }),
      ]),
    );
    wrapper.unmount();
    expect(mount(Probe).exists()).toBe(true);
  });
});
