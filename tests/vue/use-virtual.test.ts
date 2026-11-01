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
function fixture(observer = false, margin = 0, columnMargin = 0) {
  const scroll = shallowRef<HTMLElement | null>();
  const data = shallowRef(rows);
  const rowHeights = shallowRef({ top: 0, bottom: 0 });
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
        pinnedRowHeights: rowHeights,
      });
      columns = useVirtualColumns(grid, {
        scrollElement: scroll,
        estimateColumnWidth: 100,
        overscan: 0,
        scrollMargin: columnMargin,
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
  return { table, grid, virtual, columns, data, scroll, el, wrapper, observers, rowHeights };
}

describe("Vue virtualization", () => {
  it("reserves measured pin bands, refreshes their heights, and reports invalid reserved space", async () => {
    const f = fixture(false, 40);
    await nextTick();
    f.rowHeights.value = { top: 20, bottom: 30 };
    await nextTick();
    expect(f.virtual.viewportSize).toBe(30);
    f.virtual.scrollToKey(10, { align: "start" });
    expect(f.el.scrollTop).toBe(400);
    f.el.scrollTop = 420;
    f.el.dispatchEvent(new Event("scroll"));
    expect(f.virtual.offset).toBe(420);
    f.rowHeights.value = { top: 30, bottom: 40 };
    await nextTick();
    expect(f.virtual.viewportSize).toBe(10);
    f.rowHeights.value = { top: -1, bottom: 40 };
    await nextTick();
    expect(f.virtual.issues).toContainEqual(
      expect.objectContaining({ code: "invalid_virtual_option" }),
    );
    expect(f.virtual.viewportSize).toBe(80);
    f.wrapper.unmount();
  });
  it("normalizes RTL scroll and reserves a sticky utility gutter without shifting the centre offset", async () => {
    const f = fixture(false, 0, 40);
    await nextTick();
    f.el.setAttribute("dir", "rtl");
    Object.defineProperty(f.el, "clientWidth", { configurable: true, value: 600 });
    f.table.resizeColumn("c0", 100);
    f.table.resizeColumn("c19", 100);
    f.table.pinColumn("c0", "start");
    f.table.pinColumn("c19", "end");
    f.el.scrollLeft = -900;
    f.el.dispatchEvent(new Event("scroll"));
    expect(f.columns.offset).toBe(900);
    expect(f.columns.viewportSize).toBe(360);
    expect(f.columns.centerItems[0]?.key).toBe("c10");
    f.columns.scrollToKey("c15", { align: "end" });
    expect(f.el.scrollLeft).toBe(-1140);
    f.columns.scrollToKey("c0");
    expect(f.el.scrollLeft).toBe(-1140);
    f.wrapper.unmount();
  });
  it("keeps pinned edges outside the centre slice, with full-surface coordinates and logical focus", async () => {
    const f = fixture();
    await nextTick();
    Object.defineProperty(f.el, "clientWidth", { configurable: true, value: 600 });
    f.table.resizeColumn("c0", 100);
    f.table.resizeColumn("c19", 100);
    f.table.pinColumn("c0", "start");
    f.table.pinColumn("c19", "end");
    expect(f.columns.viewportSize).toBe(400);
    expect(f.columns.totalSize).toBe(2000);
    expect(f.columns.pinnedStartItems[0]).toMatchObject({
      key: "c0",
      index: 0,
      start: 0,
      size: 100,
    });
    expect(f.columns.pinnedEndItems[0]).toMatchObject({
      key: "c19",
      index: 19,
      start: 1900,
      size: 100,
    });
    f.columns.scrollToKey("c10", { align: "start" });
    expect(f.el.scrollLeft).toBe(900);
    expect(f.columns.centerItems.map((item) => item.key)).toEqual(["c10", "c11", "c12", "c13"]);
    expect(f.columns.items.map((item) => item.index)).toEqual([0, 10, 11, 12, 13, 19]);
    expect(f.columns.getItem(10)).toMatchObject({ key: "c10", start: 1000 });
    f.el.scrollLeft += 10;
    f.el.dispatchEvent(new Event("scroll"));
    f.table.resizeColumn("c1", 250);
    expect(f.el.scrollLeft).toBe(1060);
    f.table.resizeColumn("c0", 140);
    expect(f.el.scrollLeft).toBe(1060);
    expect(f.columns.viewportSize).toBe(360);
    expect(f.columns.getItem(10)?.start).toBe(1190);
    f.grid.focusCell({ row: 0, column: 19 });
    expect(f.el.scrollLeft).toBe(1060);
    f.columns.scrollToIndex(0, { align: "start" });
    expect(f.el.scrollLeft).toBe(1060);
    f.columns.scrollToIndex(-1);
    f.columns.scrollToKey("missing");
    expect(f.columns.getItem(20)).toBeUndefined();
    f.table.toggleColumn("c0", false);
    expect(f.columns.pinnedStartItems).toEqual([]);
    expect(f.columns.getItem(18)?.key).toBe("c19");
    expect(f.columns.viewportSize).toBe(500);
    f.table.pinColumn("c19", false);
    expect(f.columns.pinnedEndItems).toEqual([]);
    expect(f.columns.viewportSize).toBe(600);
    f.wrapper.unmount();
  });

  it("renders pins in SSR even when the centre initial count is zero or every column is pinned", () => {
    const scope = effectScope();
    scope.run(() => {
      const table = useDataTable({
        data: rows,
        columns: [
          { id: "name", width: 160 },
          { id: "id", width: 80 },
          { id: "other", accessor: () => "other", width: 90 },
        ],
        columnPinning: { start: ["name"], end: ["other"] },
      });
      const virtual = useVirtualColumns(useDataGrid(table), {
        scrollElement: null,
        initialCount: 0,
      });
      expect(virtual.items.map((item) => item.key)).toEqual(["name", "other"]);
      expect(virtual.centerItems).toEqual([]);
      expect(virtual.getItem(1)).toMatchObject({ key: "id", start: 160, size: 80 });
      table.pinColumn("id", "start");
      expect(virtual.items.map((item) => item.key)).toEqual(["name", "id", "other"]);
      expect(virtual.items.map((item) => item.start)).toEqual([0, 160, 240]);
      expect(virtual.totalSize).toBe(330);
      table.toggleColumn("name", false);
      expect(virtual.items.map((item) => item.start)).toEqual([0, 80]);
      expect(virtual.totalSize).toBe(170);
    });
    scope.stop();
  });

  it("retains independently measured group headers across collapse, expansion and row pinning", async () => {
    const f = fixture(true);
    await nextTick();
    f.table.groupBy(["c0"]);
    const group = f.table.renderItems[0]!;
    if (group.kind !== "group") throw Error("Expected group");
    const header = document.createElement("div");
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue({
      height: 70,
      width: 100,
    } as DOMRect);
    f.virtual.measureElement(header, group.key);
    await nextTick();
    expect(f.virtual.getItem(0)).toMatchObject({ key: group.key, size: 70 });
    expect(f.virtual.totalSize).toBe(8030);
    f.table.toggleGroup(group.key, false);
    expect(f.virtual.totalSize).toBe(7990);
    expect(f.virtual.getItem(0)?.size).toBe(70);
    f.table.toggleGroup(group.key, true);
    expect(f.virtual.totalSize).toBe(8030);
    f.table.pinRow(0, "top");
    expect(f.virtual.totalSize).toBe(7920);
    f.table.pinRow(0, false);
    expect(f.virtual.getItem(0)).toMatchObject({ key: group.key, size: 70 });
    f.virtual.scrollToKey(20, { align: "start" });
    expect(
      f.virtual.items.some(
        (item) => item.renderItem.kind === "row" && item.renderItem.row.key === 20,
      ),
    ).toBe(true);
    f.wrapper.unmount();
  });
  it("anchors group disclosures using the latest physical scroll, without scrolling a relocated selection against stale items", async () => {
    const f = fixture();
    await nextTick();
    f.table.setColumns([{ id: "team", accessor: (row) => (row.id < 50 ? "A" : "B") }]);
    f.table.groupBy(["team"]);
    f.grid.focusCell({ row: 0, column: 0 });
    const group = f.table.renderItems[0]!;
    if (group.kind !== "group") throw Error("Expected group");
    // Focusing the disclosure can update scrollTop before the browser delivers a scroll event.
    f.el.scrollTop = 40;
    f.el.dispatchEvent(new Event("scroll"));
    f.el.scrollTop = 0;
    f.table.toggleGroup(group.key, false);
    expect(f.el.scrollTop).toBe(0);
    expect(f.grid.cellAt(f.grid.selection!.focus)?.row.key).toBe(50);
    f.table.toggleGroup(group.key, true);
    expect(f.grid.selection?.focus.row).toBe(50);
    expect(f.el.scrollTop).toBe(0);
    expect(f.virtual.items[0]?.key).toBe(group.key);
    f.wrapper.unmount();
  });
  it("uses effective widths before mount, clamps controlled sizes, and resets to definitions", () => {
    const scope = effectScope();
    scope.run(() => {
      const table = useDataTable({
        data: rows,
        columns: [{ id: "name", width: 160, minWidth: 80, maxWidth: 320 }, { id: "id" }],
      });
      const columns = useVirtualColumns(useDataGrid(table), { scrollElement: null });
      expect(columns.items.map((item) => item.size)).toEqual([160, 120]);
      table.resizeColumn("name", 250);
      expect(columns.getItem(0)?.size).toBe(250);
      table.setState({ columnSizing: { name: 999 } });
      expect(columns.getItem(0)?.size).toBe(320);
      table.reset();
      expect(columns.getItem(0)?.size).toBe(160);
      table.setColumns([{ id: "name", width: 200 }, { id: "id" }]);
      expect(columns.getItem(0)?.size).toBe(200);
    });
    scope.stop();
  });

  it.each([false, true])(
    "refreshes measured column sizes after resize and reset (observer: %s)",
    async (observer) => {
      const f = fixture(observer);
      await nextTick();
      const header = document.createElement("div");
      const headerBounds = vi.spyOn(header, "getBoundingClientRect").mockReturnValue({
        height: 40,
        width: 100,
      } as DOMRect);
      const secondHeader = document.createElement("div");
      vi.spyOn(secondHeader, "getBoundingClientRect").mockReturnValue({
        height: 40,
        width: 150,
      } as DOMRect);
      f.columns.measureElement(header, "c0");
      f.columns.measureElement(secondHeader, "c1");
      await nextTick();
      expect(f.columns.totalSize).toBe(2050);

      f.columns.scrollToKey("c5", { align: "start" });
      f.el.scrollLeft += 10;
      f.el.dispatchEvent(new Event("scroll"));
      f.table.resizeColumn("c0", 250);
      expect(f.columns.getItem(0)?.size).toBe(250);
      expect(f.columns.getItem(1)?.size).toBe(150);
      expect(f.columns.getItem(2)?.start).toBe(400);
      expect(f.columns.totalSize).toBe(2200);
      expect(f.el.scrollLeft).toBe(710);

      f.table.moveColumn("c1", 0);
      expect(f.columns.getItem(0)).toMatchObject({ key: "c1", size: 150 });
      expect(f.columns.getItem(1)).toMatchObject({ key: "c0", size: 250 });
      f.table.resetColumnSize("c0");
      expect(f.columns.getItem(1)?.size).toBe(100);
      expect(f.columns.totalSize).toBe(2050);

      f.table.toggleColumn("c0", false);
      f.table.resizeColumn("c0", 300);
      f.table.toggleColumn("c0", true);
      expect(f.columns.getItem(1)?.size).toBe(300);
      f.table.setState({ columnSizing: { c0: 180 } });
      expect(f.columns.getItem(1)?.size).toBe(180);
      f.table.resetColumnSize();
      expect(f.columns.getItem(1)?.size).toBe(100);
      expect(f.columns.getItem(0)?.size).toBe(150);
      headerBounds.mockReturnValue({ height: 40, width: 130 } as DOMRect);
      f.columns.measureElement(null, "c0");
      f.columns.measureElement(header, "c0");
      await nextTick();
      expect(f.columns.getItem(1)?.size).toBe(130);
      f.table.resizeColumn("c1", 220);
      expect(f.columns.getItem(1)?.size).toBe(130);
      f.wrapper.unmount();
    },
  );

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
              virtual.items.map((item) =>
                h("li", item.renderItem.kind === "row" ? item.renderItem.row.original.name : ""),
              ),
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
    expect(
      f.virtual.items.some(
        (item) => (item.renderItem.kind === "group" ? undefined : item.renderItem.row.key) === 10,
      ),
    ).toBe(true);
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
    expect(
      f.virtual.items.some(
        (item) => (item.renderItem.kind === "group" ? undefined : item.renderItem.rowIndex) === 51,
      ),
    ).toBe(true);
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
