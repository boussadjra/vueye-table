import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { VueyeGrid, VueyeTable } from "vueye-table";

const data = Array.from({ length: 1000 }, (_, id) => ({ id, name: `Name ${id}` }));
const columns = [{ id: "name", width: 150 }];
function size(element: Element) {
  Object.defineProperties(element, { clientHeight: { value: 120 }, clientWidth: { value: 300 } });
  element.dispatchEvent(new Event("scroll"));
}
describe("full component virtualization", () => {
  it("defaults virtual tables to all rows, keeps selectable custom cells and hides pagination", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data, columns, virtual: true, overscan: 0, selectable: true, height: "240px" },
      slots: { "cell.name": ({ display }: { display: string }) => `Custom ${display}` },
    });
    size(wrapper.get(".vt-scroll").element);
    await nextTick();
    expect(wrapper.find(".vt-pagination").exists()).toBe(false);
    expect(wrapper.findAll("tbody tr[data-key]")).toHaveLength(3);
    expect(wrapper.get("tbody tr[data-key] td[data-column]").text()).toBe("Custom Name 0");
    await wrapper.get("tbody input[type=checkbox]").trigger("change");
    expect(wrapper.emitted("update:selected")?.at(-1)).toEqual([[0]]);
    await wrapper.get(".vt-search input").setValue("no match");
    expect(wrapper.get(".vt-empty").text()).toBe("No matching rows");
    expect(wrapper.findAll("tbody tr[data-virtual-spacer]")).toHaveLength(0);
    wrapper.unmount();
  });
  it("can explicitly virtualize a paginated table and retain footer controls", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data, columns, virtual: true, paginate: true, pageSize: 50 },
    });
    size(wrapper.get(".vt-scroll").element);
    await nextTick();
    expect(wrapper.find(".vt-pagination").exists()).toBe(true);
    expect(wrapper.get(".vt-status").text()).toContain("1–50 of 1000");
    wrapper.unmount();
  });
  it("forwards grid windowing and keeps offscreen keyboard editing and data emissions", async () => {
    const wrapper = mount(VueyeGrid, {
      props: { data, columns, virtual: true, virtualColumns: true, overscan: 0, height: "240px" },
      attrs: { "aria-describedby": "virtual-grid-help" },
      attachTo: document.body,
    });
    size(wrapper.get(".vt-scroll").element);
    await nextTick();
    const grid = wrapper.get("[role=grid]");
    expect(grid.attributes("aria-describedby")).toBe("virtual-grid-help");
    await grid.trigger("keydown", { key: "End", ctrlKey: true });
    expect(wrapper.find(`#${grid.attributes("aria-activedescendant")}`).exists()).toBe(true);
    await grid.trigger("keydown", { key: "Enter" });
    await wrapper.get("input[data-editor]").setValue("Updated");
    await wrapper.get("input[data-editor]").trigger("keydown", { key: "Enter" });
    const updated = wrapper.emitted("update:data")?.at(-1)?.[0] as typeof data | undefined;
    expect(updated?.at(-1)?.name).toBe("Updated");
    expect(data.at(-1)?.name).toBe("Name 999");
    expect(wrapper.find(".vt-row-number").exists()).toBe(true);
    wrapper.unmount();
  });
});
