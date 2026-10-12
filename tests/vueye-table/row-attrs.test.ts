import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueyeGrid, VueyeTable, type RowAttrs } from "vueye-table";

interface Pupil {
  readonly id: number;
  readonly name: string;
  readonly status: "present" | "absent";
}

const pupils: readonly Pupil[] = [
  { id: 1, name: "Amina", status: "absent" },
  { id: 2, name: "Yacine", status: "present" },
];
const columns = [{ id: "name" }, { id: "status" }];
const tone: RowAttrs<Pupil> = (pupil) => ({
  class: { "is-absent": pupil.status === "absent" },
  "data-status": pupil.status,
  "data-testid": `row-${pupil.id}`,
});
const quiet = { searchable: false, columnToggle: false, pagination: false, toolbar: false };

function size(element: Element) {
  Object.defineProperties(element, { clientHeight: { value: 120 }, clientWidth: { value: 300 } });
  element.dispatchEvent(new Event("scroll"));
}

describe.each([
  ["VueyeTable", VueyeTable],
  ["VueyeGrid", VueyeGrid],
] as const)("rowAttrs on %s", (_name, Component) => {
  it("puts the row's class and data attributes on its tr", () => {
    const wrapper = mount(Component, {
      props: { data: pupils, columns, rowAttrs: tone, ...quiet },
    });
    const absent = wrapper.get('tr[data-key="1"]');
    expect(absent.classes()).toContain("is-absent");
    expect(absent.attributes("data-status")).toBe("absent");
    expect(absent.attributes("data-testid")).toBe("row-1");
    expect(wrapper.get('tr[data-key="2"]').classes()).not.toContain("is-absent");
    wrapper.unmount();
  });

  it("follows the item on the same element when the data changes", async () => {
    const wrapper = mount(Component, {
      props: { data: pupils, columns, rowAttrs: tone, ...quiet },
    });
    const before = wrapper.get('tr[data-key="1"]').element;
    await wrapper.setProps({
      data: pupils.map((pupil) => (pupil.id === 1 ? { ...pupil, status: "present" } : pupil)),
    });
    const after = wrapper.get('tr[data-key="1"]');
    expect(after.element).toBe(before);
    expect(after.attributes("data-status")).toBe("present");
    expect(after.classes()).not.toContain("is-absent");
    wrapper.unmount();
  });

  it("never overrides the row's own attributes and drops handlers", async () => {
    const onClick = vi.fn<() => void>();
    const wrapper = mount(Component, {
      props: {
        data: pupils,
        columns,
        rowAttrs: () => ({ "data-key": "other", "aria-rowindex": 99, onClick, tabindex: 3 }),
        ...quiet,
      },
    });
    const row = wrapper.findAll("tbody tr")[0]!;
    expect(row.attributes("data-key")).toBe("1");
    expect(row.attributes("aria-rowindex")).not.toBe("99");
    expect(row.attributes("tabindex")).toBeUndefined();
    await row.trigger("click");
    expect(onClick).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("reaches virtual rows and keeps their measuring hook", async () => {
    const data = Array.from({ length: 200 }, (_, id) => ({
      id,
      name: `Pupil ${id}`,
      status: id % 2 ? "present" : "absent",
    })) as Pupil[];
    const wrapper = mount(Component, {
      props: { data, columns, rowAttrs: tone, virtual: true, height: "240px", ...quiet },
      attachTo: document.body,
    });
    size(wrapper.get(".vt-scroll").element);
    await nextTick();
    const rows = wrapper.findAll("tbody tr[data-key]");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.attributes("data-virtual-row")).toBe("");
      expect(row.attributes("data-status")).toBe(
        Number(row.attributes("data-key")) % 2 ? "present" : "absent",
      );
    }
    wrapper.unmount();
  });

  it("keeps a tree row's level and expansion", () => {
    interface Node {
      readonly id: number;
      readonly name: string;
      readonly children?: readonly Node[];
    }
    const wrapper = mount(Component, {
      props: {
        data: [{ id: 1, name: "Folder", children: [{ id: 2, name: "File" }] }],
        columns: [{ id: "name" }],
        getChildren: (node: Node) => node.children,
        treeColumn: "name",
        rowAttrs: () => ({ "aria-level": 7, "aria-expanded": "maybe", "data-kind": "folder" }),
        ...quiet,
      },
    });
    const row = wrapper.get('tr[data-key="1"]');
    expect(row.attributes("aria-level")).toBe("1");
    expect(row.attributes("aria-expanded")).toBe("false");
    expect(row.attributes("data-kind")).toBe("folder");
    wrapper.unmount();
  });
});

describe("rowAttrs and row-click", () => {
  it("still emits row-click once", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data: pupils, columns, rowAttrs: tone, ...quiet },
    });
    await wrapper.get('tr[data-key="2"]').trigger("click");
    expect(wrapper.emitted("row-click")).toHaveLength(1);
    expect(wrapper.emitted("row-click")?.[0]?.[0]).toEqual(pupils[1]);
    wrapper.unmount();
  });
});
