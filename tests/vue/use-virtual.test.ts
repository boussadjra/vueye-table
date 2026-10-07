import { mount } from "@vue/test-utils";
import { getRowItemKey } from "@vueye-table/core";
import {
  useDataGrid,
  useDataTable,
  useVirtualRows,
  useVirtualColumns,
  type VirtualBinding,
  type VirtualRowItem,
} from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, nextTick, shallowRef } from "vue";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

const rows = Array.from({ length: 100 }, (_, id) => ({ id, name: `Row ${id}` }));
function fixture(observer = false, margin = 0) {
  const scroll = shallowRef<HTMLElement | null>();
  const data = shallowRef(rows);
  const observers: {
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn<(element: Element) => void>>;
    unobserve: ReturnType<typeof vi.fn<(element: Element) => void>>;
    disconnect: ReturnType<typeof vi.fn<() => void>>;
  }[] = [];
  class FakeObserver {
    observe = vi.fn<(element: Element) => void>();
    unobserve = vi.fn<(element: Element) => void>();
    disconnect = vi.fn<() => void>();
    constructor(public callback: ResizeObserverCallback) {
      observers.push(this);
    }
  }
  vi.stubGlobal("ResizeObserver", observer ? FakeObserver : undefined);
  let table!: ReturnType<typeof useDataTable<(typeof rows)[number]>>;
  let grid!: ReturnType<typeof useDataGrid<(typeof rows)[number]>>;
  let virtual!: VirtualBinding<VirtualRowItem<(typeof rows)[number]>>;
  let columns!: ReturnType<typeof useVirtualColumns<(typeof rows)[number]>>;
  const component = defineComponent({
    setup() {
      table = useDataTable({
        data,
        columns: Array.from({ length: 20 }, (_, i) => ({
          id: `c${i}`,
          accessor: (row) => row.name,
        })),
        paginate: false,
        getRowCanExpand: () => true,
      });
      grid = useDataGrid(table);
      virtual = useVirtualRows(table, {
        scrollElement: scroll,
        estimateRowHeight: 40,
        overscan: 1,
        initialCount: 3,
        grid,
        scrollMargin: margin,
      });
      columns = useVirtualColumns(grid, {
        scrollElement: scroll,
        estimateColumnWidth: 100,
        overscan: 0,
      });
      return () => h("div", { ref: scroll });
    },
  });
  const wrapper = mount(component);
  const el = wrapper.element as HTMLElement;
  Object.defineProperties(el, {
    clientHeight: { configurable: true, value: 120 },
    clientWidth: { configurable: true, value: 200 },
  });
  el.dispatchEvent(new Event("scroll"));
  return { table, grid, virtual, columns, data, scroll, el, wrapper, observers };
}

describe("Vue virtualization", () => {
  it("accounts for leading header space and reports invalid margins", async () => {
    const f = fixture(false, 40);
    await nextTick();
    expect(f.virtual.viewportSize).toBe(80);
    f.virtual.scrollToIndex(99, { align: "end" });
    expect(f.el.scrollTop).toBe(3960);
    expect(f.virtual.getItem(99)?.start).toBe(3960);
    expect(f.virtual.getItem(100)).toBeUndefined();
    f.el.scrollTop = 440;
    f.el.dispatchEvent(new Event("scroll"));
    expect(f.virtual.offset).toBe(400);
    f.wrapper.unmount();
    const invalid = fixture(false, -4);
    expect(invalid.virtual.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "invalid_virtual_option" })]),
    );
    invalid.wrapper.unmount();
  });
  it("renders exactly initialCount items in SSR without reading an element", async () => {
    const app = createSSRApp(
      defineComponent({
        setup() {
          const table = useDataTable({ data: rows, columns: [{ id: "name" }], paginate: false });
          const virtual = useVirtualRows(table, {
            scrollElement: null,
            initialCount: 3,
            estimateRowHeight: (index) => (index === 0 ? 60 : 40),
          });
          return () =>
            h(
              "ul",
              virtual.items.map((item) => h("li", item.renderItem.row.original.name)),
            );
        },
      }),
    );
    const html = await renderToString(app);
    expect(html.match(/<li>/gu)).toHaveLength(3);
    expect(html).toContain("Row 2");
    expect(html).not.toContain("Row 3");
  });
  it("windows both axes and scrolls by index and typed row key", async () => {
    const f = fixture();
    await nextTick();
    expect(f.virtual.items.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    f.el.scrollTop = 400;
    f.el.dispatchEvent(new Event("scroll"));
    expect(f.virtual.items[0]?.index).toBe(9);
    expect(f.virtual.paddingStart).toBe(360);
    f.virtual.scrollToIndex(50, { align: "start" });
    expect(f.el.scrollTop).toBe(2000);
    f.virtual.scrollToKey(20, { align: "center" });
    expect(f.el.scrollTop).toBe(760);
    f.virtual.scrollToKey("missing");
    expect(f.el.scrollTop).toBe(760);
    f.columns.scrollToKey("c10", { align: "end" });
    expect(f.el.scrollLeft).toBe(900);
    expect(f.columns.items.map((item) => item.column.id)).toEqual(["c9", "c10"]);
    f.wrapper.unmount();
  });
  it("keeps the first visible row and inset after insert, reorder and measurement above it", async () => {
    const f = fixture(true);
    await nextTick();
    f.virtual.scrollToKey(10, { align: "start" });
    f.el.scrollTop += 10;
    f.el.dispatchEvent(new Event("scroll"));
    f.data.value = [{ id: 100, name: "New" }, ...rows];
    await nextTick();
    expect(f.el.scrollTop).toBe(450);
    const measured = document.createElement("div");
    vi.spyOn(measured, "getBoundingClientRect").mockReturnValue({
      height: 80,
      width: 100,
    } as DOMRect);
    f.virtual.measureElement(measured, getRowItemKey(0));
    await nextTick();
    expect(f.el.scrollTop).toBe(490);
    f.virtual.measureElement(measured, getRowItemKey(0));
    expect(f.el.scrollTop).toBe(490);
    f.data.value = [...f.data.value].reverse();
    await nextTick();
    expect(f.virtual.items.some((item) => item.renderItem.row.key === 10)).toBe(true);
    f.table.search("Row 10");
    expect(f.el.scrollTop).toBe(0);
    f.table.search("missing");
    expect(f.virtual.items).toEqual([]);
    expect(f.virtual.totalSize).toBe(0);
    f.wrapper.unmount();
  });
  it("waits for row patches before measuring and skips released refs", async () => {
    const f = fixture();
    await nextTick();
    const target = document.createElement("div");
    const bounds = vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      height: 80,
      width: 100,
    } as DOMRect);
    f.virtual.measureElement(target, getRowItemKey(0));
    expect(bounds).not.toHaveBeenCalled();
    f.virtual.measureElement(null, getRowItemKey(0));
    await nextTick();
    expect(bounds).not.toHaveBeenCalled();
    f.virtual.measureElement(target, getRowItemKey(0));
    await nextTick();
    expect(f.virtual.totalSize).toBe(4040);
    f.wrapper.unmount();
  });
  it("measures details independently and observes row and viewport resizes", async () => {
    const f = fixture(true);
    await nextTick();
    f.table.toggleExpanded(0);
    const detail = document.createElement("div");
    let height = 80;
    vi.spyOn(detail, "getBoundingClientRect").mockImplementation(
      () => ({ height, width: 150 }) as DOMRect,
    );
    f.virtual.measureElement(detail, getRowItemKey(0, "detail"));
    await nextTick();
    expect(f.virtual.totalSize).toBe(4080);
    const rowObserver = f.observers[0]!;
    height = 120;
    rowObserver.callback(
      [{ target: detail }] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver,
    );
    expect(f.virtual.totalSize).toBe(4120);
    Object.defineProperty(f.el, "clientHeight", { value: 200 });
    rowObserver.callback(
      [{ target: f.el }] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver,
    );
    expect(f.virtual.viewportSize).toBe(200);
    f.virtual.measureElement(null, getRowItemKey(0, "detail"));
    expect(rowObserver.unobserve).toHaveBeenCalledWith(detail);
    f.virtual.measureElement({} as never, "ignored");
    f.wrapper.unmount();
    expect(rowObserver.disconnect).toHaveBeenCalled();
  });
  it("brings keyboard focus into view while details keep logical grid positions", async () => {
    const f = fixture();
    await nextTick();
    f.table.toggleExpanded(0);
    f.grid.focusCell({ row: 50, column: 10 });
    expect(
      f.virtual.items.some(
        (item) => item.renderItem.kind === "row" && item.renderItem.rowIndex === 50,
      ),
    ).toBe(true);
    expect(f.columns.items.some((item) => item.index === 10)).toBe(true);
    f.grid.handleKey({ key: "ArrowDown" });
    expect(f.virtual.items.some((item) => item.renderItem.rowIndex === 51)).toBe(true);
    f.grid.handleKey({ key: "ArrowRight" });
    expect(f.columns.items.some((item) => item.index === 11)).toBe(true);
    f.wrapper.unmount();
  });
  it("detaches old elements, supports the fixed-size fallback and stops on scope disposal", async () => {
    const f = fixture();
    await nextTick();
    const remove = vi.spyOn(f.el, "removeEventListener");
    const second = document.createElement("div");
    Object.defineProperty(second, "clientHeight", { value: 80, configurable: true });
    f.scroll.value = second;
    await nextTick();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(f.virtual.viewportSize).toBe(80);
    f.el.scrollTop = 500;
    f.el.dispatchEvent(new Event("scroll"));
    expect(f.virtual.offset).toBe(0);
    Object.defineProperty(second, "clientHeight", { value: 160, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(f.virtual.viewportSize).toBe(160);
    f.scroll.value = null;
    await nextTick();
    f.wrapper.unmount();
    const view = f.virtual.items;
    second.scrollTop = 500;
    second.dispatchEvent(new Event("scroll"));
    expect(f.virtual.items).toBe(view);
  });
  it("handles zero, invalid and default SSR counts in an effect scope", () => {
    const scope = effectScope();
    scope.run(() => {
      const table = useDataTable({ data: rows, columns: [{ id: "name" }], paginate: false });
      expect(useVirtualRows(table, { scrollElement: null, initialCount: 0 }).items).toHaveLength(0);
      const virtual = useVirtualRows(table, { scrollElement: null, initialCount: -1 });
      expect(virtual.items).toHaveLength(10);
      expect(virtual.issues[0]?.code).toBe("invalid_virtual_option");
      const empty = useDataTable({ data: [], columns: [] });
      expect(useVirtualRows(empty, { scrollElement: null }).totalSize).toBe(0);
    });
    scope.stop();
  });
});
