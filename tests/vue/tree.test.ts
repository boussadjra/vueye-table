import { mount } from "@vue/test-utils";
import { getRowItemKey } from "@vueye-table/core";
import {
  useDataTable,
  useVirtualRows,
  type DataTableBinding,
  type VirtualBinding,
  type VirtualRowItem,
} from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";

interface Node {
  readonly id: number;
  readonly name: string;
  readonly children?: readonly Node[] | undefined;
}
describe("Vue trees", () => {
  it("anchors the same keyed row when an earlier subtree opens, closes, and changes height", async () => {
    const scroll = shallowRef<HTMLElement | null>(null);
    let table!: DataTableBinding<Node>;
    let virtual!: VirtualBinding<VirtualRowItem<Node>>;
    const wrapper = mount(
      defineComponent({
        setup() {
          table = useDataTable<Node>({
            data: [
              { id: 0, name: "Root", children: [{ id: 100, name: "Child" }] },
              ...Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Root ${i + 1}` })),
            ],
            columns: [{ id: "name" }],
            getChildren: (row) => row.children,
            paginate: false,
          });
          virtual = useVirtualRows(table, {
            scrollElement: scroll,
            estimateRowHeight: 40,
            overscan: 0,
          });
          return () => h("div", { ref: scroll });
        },
      }),
    );
    const el = wrapper.element as HTMLElement;
    Object.defineProperty(el, "clientHeight", { value: 120, configurable: true });
    el.dispatchEvent(new Event("scroll"));
    await nextTick();
    virtual.scrollToKey(10, { align: "start" });
    expect(el.scrollTop).toBe(400);
    table.toggleExpanded(0);
    expect(el.scrollTop).toBe(440);
    const child = document.createElement("div");
    vi.spyOn(child, "getBoundingClientRect").mockReturnValue({ height: 80 } as DOMRect);
    virtual.measureElement(child, getRowItemKey(100));
    expect(el.scrollTop).toBe(480);
    table.collapseAll();
    expect(el.scrollTop).toBe(400);
    table.toggleExpanded(0);
    expect(el.scrollTop).toBe(480);
    expect(virtual.items[0]?.renderItem.row.key).toBe(10);
    wrapper.unmount();
  });
  it("cancels native lazy signals when a Vue scope is disposed", async () => {
    let signal: AbortSignal | undefined;
    const wrapper = mount(
      defineComponent({
        setup() {
          const table = useDataTable<Node, AbortSignal>({
            data: [{ id: 1, name: "Root" }],
            columns: [{ id: "name" }],
            hasChildren: () => true,
            createChildLoadController: () => new AbortController(),
            loadChildren: (_row, next) => {
              signal = next;
              return new Promise(() => {});
            },
          });
          table.expandAll();
          return () => h("div", String(table.rows[0]?.childStatus));
        },
      }),
    );
    await Promise.resolve();
    expect(signal?.aborted).toBe(false);
    expect(wrapper.text()).toBe("loading");
    wrapper.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
