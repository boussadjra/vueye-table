import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueyeTable, VueyeGrid, type VueyeTableExposed } from "vueye-table";

const data = [
  { id: 1, name: "Ada", team: "Engineering", score: 42 },
  { id: 2, name: "Grace", team: "Support", score: 50 },
];
const columns = [
  { id: "name", width: 180, minWidth: 100, maxWidth: 300 },
  { id: "team", width: 200, resizable: false },
  { id: "score", width: 140, minWidth: 80, maxWidth: 240 },
];

describe("component column layout", () => {
  it("uses the same constrained fallback for unsized virtual columns and their resize handles", async () => {
    const wrapper = mount(VueyeGrid, {
      props: {
        data,
        columns: [
          { id: "name", minWidth: 200, maxWidth: 260 },
          { id: "team", maxWidth: 100 },
        ],
        virtual: true,
        virtualColumns: true,
        resizableColumns: true,
        columnWidth: 176,
      },
    });
    const scroll = wrapper.get(".vt-scroll").element;
    Object.defineProperties(scroll, { clientWidth: { value: 600 }, clientHeight: { value: 160 } });
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    const handle = wrapper.get('[aria-label="Resize Name"]');
    expect(handle.attributes("aria-valuenow")).toBe("200");
    expect(wrapper.findAll("colgroup col")[1]!.attributes("style")).toContain("200px");
    expect(wrapper.get('[aria-label="Resize Team"]').attributes("aria-valuenow")).toBe("100");
    await handle.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:columnSizing")).toEqual([[{ name: 210 }]]);
    wrapper.unmount();
  });
  it("keeps one native col per utility cell when both axes are virtualized", async () => {
    const wrapper = mount(VueyeTable, {
      props: {
        data,
        columns,
        virtual: true,
        virtualColumns: true,
        selectable: true,
        resizableColumns: true,
        columnPinning: { start: ["name"], end: ["score"] },
      },
      slots: { expanded: () => "Details" },
    });
    await nextTick();
    const cols = wrapper.findAll("colgroup col");
    expect(cols).toHaveLength(5);
    expect((cols[0]!.element as HTMLTableColElement).style.width).toBe("44px");
    expect((cols[1]!.element as HTMLTableColElement).style.width).toBe("44px");
    expect(wrapper.get('thead [data-column="name"]').attributes("aria-colindex")).toBe("3");
    wrapper.unmount();
  });
  it.each([VueyeTable, VueyeGrid])(
    "keeps resize UI opt-in and preserves configured widths (%s)",
    (component) => {
      const wrapper = mount(component, { props: { data, columns } });
      expect(wrapper.findAll('[role="separator"]')).toHaveLength(0);
      expect(wrapper.get('th[data-column="name"]').attributes("style")).toContain("width: 180px");
      expect(wrapper.find("colgroup").exists()).toBe(false);
      wrapper.unmount();
    },
  );

  it.each([VueyeTable, VueyeGrid])(
    "previews a captured drag and commits one model update (%s)",
    async (component) => {
      const wrapper = mount(component, { props: { data, columns, resizableColumns: true } });
      const handle = wrapper.get('[aria-label="Resize Name"]');
      const target = handle.element as HTMLElement;
      const capture = vi.fn<(id: number) => void>();
      target.setPointerCapture = capture;
      target.hasPointerCapture = vi.fn<(id: number) => boolean>(() => true);
      const release = vi.fn<(id: number) => void>();
      target.releasePointerCapture = release;
      expect(wrapper.findAll('[role="separator"]')).toHaveLength(2);
      expect(handle.attributes("aria-valuemin")).toBe("100");
      expect(handle.attributes("aria-valuemax")).toBe("300");
      await handle.trigger("pointerdown", { pointerId: 3, button: 0, clientX: 100 });
      await handle.trigger("pointermove", { pointerId: 3, clientX: 140 });
      await handle.trigger("pointermove", { pointerId: 3, clientX: 160 });
      expect(capture).toHaveBeenCalledWith(3);
      expect(wrapper.get("table").element.style.getPropertyValue("--vt-column-0-width")).toBe(
        "240px",
      );
      expect(handle.attributes("aria-valuenow")).toBe("240");
      expect(wrapper.emitted("update:columnSizing")).toBeUndefined();
      await handle.trigger("pointerup", { pointerId: 3, clientX: 170 });
      expect(wrapper.emitted("update:columnSizing")).toEqual([[{ name: 250 }]]);
      expect(release).toHaveBeenCalledWith(3);
      expect(wrapper.get("table").element.style.getPropertyValue("--vt-column-0-width")).toBe("");
      expect(wrapper.find("colgroup").exists()).toBe(true);
      expect(wrapper.get("table").element.style.tableLayout).toBe("fixed");
      expect(wrapper.emitted("update:sorting")).toBeUndefined();
      wrapper.unmount();
    },
  );

  it("supports keyboard limits, Shift steps, reset, RTL and caller-controlled updates without echoes", async () => {
    const wrapper = mount(VueyeTable, {
      attrs: { dir: "rtl" },
      props: {
        data,
        columns,
        resizableColumns: true,
        messages: { resizeColumn: (header: string) => `Adjust ${header}` },
      },
    });
    const handle = wrapper.get('[aria-label="Adjust Name"]');
    await handle.trigger("keydown", { key: "ArrowRight" });
    expect(handle.attributes("aria-valuenow")).toBe("170");
    await handle.trigger("keydown", { key: "ArrowLeft", shiftKey: true });
    expect(handle.attributes("aria-valuenow")).toBe("220");
    await handle.trigger("keydown", { key: "End" });
    expect(handle.attributes("aria-valuenow")).toBe("300");
    await handle.trigger("keydown", { key: "ArrowLeft" });
    expect(handle.attributes("aria-valuenow")).toBe("300");
    await handle.trigger("keydown", { key: "Home" });
    expect(handle.attributes("aria-valuenow")).toBe("100");
    await handle.trigger("keydown", { key: "Enter" });
    expect(handle.attributes("aria-valuenow")).toBe("180");
    await wrapper.setProps({ columnSizing: { name: 210 } });
    expect(handle.attributes("aria-valuenow")).toBe("210");
    expect(wrapper.emitted("update:columnSizing")).toHaveLength(5);
    await handle.trigger("dblclick");
    expect(wrapper.emitted("update:columnSizing")).toHaveLength(6);
    wrapper.unmount();
  });

  it("cancels previews on pointer cancellation, Escape, and source replacement", async () => {
    const wrapper = mount(VueyeTable, { props: { data, columns, resizableColumns: true } });
    const handle = wrapper.get('[aria-label="Resize Name"]');
    const start = async (): Promise<void> => {
      await handle.trigger("pointerdown", { pointerId: 1, button: 0, clientX: 0 });
      await handle.trigger("pointermove", { pointerId: 1, clientX: 80 });
    };
    await start();
    await handle.trigger("pointercancel", { pointerId: 1 });
    expect(handle.attributes("aria-valuenow")).toBe("180");
    await start();
    await handle.trigger("keydown", { key: "Escape" });
    expect(handle.attributes("aria-valuenow")).toBe("180");
    await start();
    await wrapper.setProps({ columns: [...columns].reverse() });
    expect(wrapper.get("table").element.style.getPropertyValue("--vt-column-0-width")).toBe("");
    expect(wrapper.emitted("update:columnSizing")).toBeUndefined();
    wrapper.unmount();
  });

  it("sticks selection and disclosure utilities before pinned data and supports controlled pinning", async () => {
    const wrapper = mount(VueyeTable, {
      props: {
        data,
        columns,
        selectable: true,
        columnPinning: { start: ["name"], end: ["score"] },
      },
      slots: { expanded: () => "Details" },
    });
    expect(wrapper.findAll("colgroup col")).toHaveLength(5);
    expect(wrapper.get('thead [data-column="name"]').attributes("data-pinned")).toBe("start");
    expect(
      wrapper.get<HTMLElement>('thead [data-column="name"]').element.style.insetInlineStart,
    ).toBe("calc(44px + 44px)");
    expect(
      wrapper.get<HTMLElement>('tbody [data-column="score"]').element.style.insetInlineEnd,
    ).toBe("0px");
    expect(
      wrapper.get<HTMLElement>('tbody [data-leading-column="1"]').element.style.insetInlineStart,
    ).toBe("44px");
    expect(wrapper.get<HTMLElement>('thead [data-column="score"]').element.style.zIndex).toBe("4");
    expect(wrapper.get<HTMLElement>('tbody [data-column="score"]').element.style.zIndex).toBe("2");
    await wrapper.setProps({ columnPinning: { start: [], end: [] } });
    expect(wrapper.findAll("[data-pinned]")).toHaveLength(0);
    expect(wrapper.emitted("update:columnPinning")).toBeUndefined();
    const table = (wrapper.vm as unknown as VueyeTableExposed).table;
    table.pinColumn("team", "start");
    await nextTick();
    expect(wrapper.emitted("update:columnPinning")).toEqual([[{ start: ["team"], end: [] }]]);
    wrapper.unmount();
  });

  it("lets the column menu pin and unpin without changing visibility", async () => {
    const wrapper = mount(VueyeTable, { props: { data, columns } });
    const control = wrapper.get('[aria-label="Pin position for Name"]');
    await control.setValue("end");
    expect(wrapper.get('thead [data-column="name"]').attributes("data-pinned")).toBe("end");
    expect(wrapper.emitted("update:hiddenColumns")).toBeUndefined();
    await control.setValue("");
    expect(wrapper.emitted("update:columnPinning")).toHaveLength(2);
    wrapper.unmount();
  });
});
