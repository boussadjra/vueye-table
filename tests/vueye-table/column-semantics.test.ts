import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h, nextTick } from "vue";
import { VueyeGrid, VueyeTable } from "vueye-table";

const data = [{ id: 1, name: "Stock", quantity: 12 }];
const columns = [{ id: "name" }, { id: "quantity" }];
const indices = (cells: readonly { attributes: (name: string) => string | undefined }[]) =>
  cells.map((cell) => cell.attributes("aria-colindex"));

describe("rendered column coordinates", () => {
  it.each([
    { actions: false, details: false, selection: false },
    { actions: true, details: false, selection: false },
    { actions: false, details: true, selection: false },
    { actions: false, details: false, selection: true },
    { actions: true, details: true, selection: true },
  ])("counts and indexes table utility cells: %j", async ({ actions, details, selection }) => {
    const offset = Number(actions) + Number(details) + Number(selection);
    const wrapper = mount(VueyeTable, {
      props: { data, columns, removeRows: actions, selectable: selection },
      ...(details ? { slots: { expanded: () => h("p", "Detail") } } : {}),
    });
    expect(wrapper.get("table").attributes("aria-colcount")).toBe(String(offset + 2));
    const expected = Array.from({ length: offset + 2 }, (_, i) => String(i + 1));
    expect(indices(wrapper.findAll("thead th"))).toEqual(expected);
    expect(indices(wrapper.findAll("tbody tr[data-key] > td"))).toEqual(expected);
    await wrapper.setProps({ columns: [...columns].reverse() });
    expect(wrapper.get('td[data-column="quantity"]').attributes("aria-colindex")).toBe(
      String(offset + 1),
    );
    expect(wrapper.get('td[data-column="name"]').attributes("aria-colindex")).toBe(
      String(offset + 2),
    );
    await wrapper.setProps({ hiddenColumns: ["name"] });
    expect(wrapper.get("table").attributes("aria-colcount")).toBe(String(offset + 1));
    expect(wrapper.get('td[data-column="quantity"]').attributes("aria-colindex")).toBe(
      String(offset + 1),
    );
    expect(wrapper.get('th[data-column="quantity"]').attributes("aria-colindex")).toBe(
      String(offset + 1),
    );
    wrapper.unmount();
  });

  it.each([true, false])(
    "keeps grid editing coordinates independent of the row header: %s",
    async (rowNumbers) => {
      const wrapper = mount(VueyeGrid, {
        props: { data, columns, rowNumbers, editable: false, toolbar: false },
      });
      const root = wrapper.get("[role=grid]");
      const offset = Number(rowNumbers);
      expect(root.attributes("aria-colcount")).toBe(String(2 + offset));
      expect(indices(wrapper.findAll("thead th"))).toEqual(
        Array.from({ length: 2 + offset }, (_, i) => String(i + 1)),
      );
      expect(wrapper.get('td[data-column="name"]').attributes("aria-colindex")).toBe(
        String(1 + offset),
      );
      await root.trigger("keydown", { key: "End", ctrlKey: true });
      expect(root.attributes("aria-activedescendant")).toMatch(/-r0-c1$/u);
      wrapper.unmount();
    },
  );

  it("reports complete counts and offset indices after horizontal virtualization", async () => {
    const wide = Array.from({ length: 24 }, (_, i) => ({ id: `c${i}`, width: 100 }));
    const wrapper = mount(VueyeGrid, {
      props: {
        data: [{ id: 1 }],
        columns: wide,
        virtual: true,
        virtualColumns: true,
        overscan: 0,
        toolbar: false,
      },
    });
    const scroll = wrapper.get(".vt-scroll").element;
    Object.defineProperties(scroll, { clientHeight: { value: 120 }, clientWidth: { value: 300 } });
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    const root = wrapper.get("[role=grid]");
    expect(root.attributes("aria-colcount")).toBe("25");
    await root.trigger("keydown", { key: "End", ctrlKey: true });
    expect(wrapper.get('td[data-column="c23"]').attributes("aria-colindex")).toBe("25");
    expect(wrapper.get('th[data-column="c23"]').attributes("aria-colindex")).toBe("25");
    expect(root.attributes("aria-activedescendant")).toMatch(/-r0-c23$/u);
    wrapper.unmount();
  });
});
