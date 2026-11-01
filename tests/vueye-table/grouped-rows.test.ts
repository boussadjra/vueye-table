import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { VueyeTable, VueyeGrid, type VueyeTableExposed, type TableState } from "vueye-table";

const data = Object.freeze(
  [
    { id: 1, name: "Ada", region: "A", team: "X", amount: 10 },
    { id: 2, name: "Alan", region: "A", team: "Y", amount: 20 },
    { id: 3, name: "Grace", region: "B", team: "X", amount: 30 },
    { id: 4, name: "Linus", region: "B", team: "Y", amount: 40 },
    { id: 5, name: "Margaret", region: "C", team: "Z", amount: 50 },
  ].map((row) => Object.freeze(row)),
);
const columns = [
  { id: "name", width: 160 },
  { id: "region", width: 100 },
  { id: "team", width: 100 },
  { id: "amount", width: 100, aggregate: "sum" as const },
];
const props = {
  data,
  columns,
  grouping: ["region"],
  rowPinning: { top: [1], bottom: [5] },
  paginate: false,
  pagination: false,
};

describe("grouped and pinned component rows", () => {
  it.each([
    ["table", VueyeTable],
    ["grid", VueyeGrid],
  ] as const)(
    "renders one indexed sequence with pins outside groups (%s)",
    async (_name, component) => {
      const wrapper = mount(component, { props });
      const root = wrapper.get("table");
      expect(root.attributes("role")).toBe("treegrid");
      expect(root.attributes("aria-rowcount")).toBe("8");
      expect(wrapper.get('[data-row-region="top"] tr').attributes("aria-rowindex")).toBe("2");
      expect(wrapper.get('[data-row-region="bottom"] tr').attributes("aria-rowindex")).toBe("8");
      expect(
        wrapper
          .findAll('[data-row-region="centre"] tr[data-key]')
          .map((row) => row.attributes("data-key")),
      ).toEqual(["2", "3", "4"]);
      expect(wrapper.findAll('[data-aggregate="amount"]').map((cell) => cell.text())).toEqual([
        "20",
        "70",
      ]);
      const first = wrapper.get("[data-group]:not([data-aggregate-footer])");
      expect(first.attributes("aria-level")).toBe("1");
      expect(
        wrapper.get('[data-row-region="centre"] tr[data-key="2"]').attributes("aria-level"),
      ).toBe("2");
      await first.get("button[aria-expanded]").trigger("click");
      expect(root.attributes("aria-rowcount")).toBe("7");
      expect(wrapper.emitted("update:expandedGroups")).toHaveLength(1);
      expect(wrapper.find('[data-row-region="centre"] tr[data-key="2"]').exists()).toBe(false);
      expect(wrapper.get('[data-row-region="top"]').text()).toContain("Ada");
      expect(data).toHaveLength(5);
      wrapper.unmount();
    },
  );

  it("counts nested group footers, keeps aggregate slots aligned, and never treats collapsed groups as empty", async () => {
    const wrapper = mount(VueyeTable, {
      props: { ...props, aggregatePosition: "footer" },
      slots: {
        group: ({ label }: { label: string }) => h("span", { "data-custom-group": "" }, label),
        "aggregate.amount": ({ display }: { display: string }) => h("strong", `Sum ${display}`),
      },
    });
    expect(wrapper.get("table").attributes("aria-rowcount")).toBe("10");
    expect(wrapper.findAll("[data-aggregate-footer]")).toHaveLength(2);
    expect(wrapper.findAll('[data-aggregate="amount"]').map((cell) => cell.text())).toEqual([
      "Sum 20",
      "Sum 70",
    ]);
    expect(
      wrapper.findAll("[data-group]:not([data-aggregate-footer]) [data-aggregate]"),
    ).toHaveLength(0);
    const table = (wrapper.vm as unknown as VueyeTableExposed).table;
    table.groupBy(["region", "team"]);
    await nextTick();
    expect(wrapper.findAll('[data-group][aria-level="2"]')).toHaveLength(6);
    table.collapseAllGroups();
    await nextTick();
    expect(wrapper.get("table").attributes("aria-rowcount")).toBe("5");
    expect(wrapper.findAll("[data-aggregate-footer]")).toHaveLength(0);
    expect(wrapper.find("[data-empty]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps virtual groups/footers keyed, pinned regions present, and grid navigation on data cells", async () => {
    const wrapper = mount(VueyeGrid, {
      props: {
        ...props,
        virtual: true,
        virtualColumns: true,
        aggregatePosition: "footer",
        rowPinningControls: true,
      },
      attachTo: document.body,
    });
    const scroll = wrapper.get(".vt-scroll").element;
    Object.defineProperties(scroll, { clientHeight: { value: 300 }, clientWidth: { value: 500 } });
    scroll.dispatchEvent(new Event("scroll"));
    await nextTick();
    const root = wrapper.get('[role="treegrid"]');
    expect(root.attributes("aria-rowcount")).toBe("10");
    expect(wrapper.find('[data-row-region="top"] tr[data-key="1"]').exists()).toBe(true);
    expect(wrapper.find('[data-row-region="bottom"] tr[data-key="5"]').exists()).toBe(true);
    expect(wrapper.find("[data-group][data-virtual-row]").exists()).toBe(true);
    const down = async (key: string): Promise<void> => {
      await root.trigger("keydown", { key: "ArrowDown" });
      const active = root.attributes("aria-activedescendant");
      expect(wrapper.get(`[id="${active}"]`).element.closest("tr")?.getAttribute("data-key")).toBe(
        key,
      );
    };
    await down("2");
    await down("3");
    await down("4");
    await down("5");
    expect(wrapper.emitted("edit")).toBeUndefined();
    wrapper.unmount();
  });

  it("round-trips all three models without echoes and exposes group ordering controls", async () => {
    const grouping = shallowRef<readonly string[]>(["region"]);
    const expanded = shallowRef<TableState["expandedGroups"]>(true);
    const pinning = shallowRef<TableState["rowPinning"]>({ top: [1], bottom: [5] });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(VueyeTable, {
            ...props,
            groupable: true,
            rowPinningControls: true,
            grouping: grouping.value,
            expandedGroups: expanded.value,
            rowPinning: pinning.value,
            "onUpdate:grouping": (value) => {
              grouping.value = value;
            },
            "onUpdate:expandedGroups": (value) => {
              expanded.value = value;
            },
            "onUpdate:rowPinning": (value) => {
              pinning.value = value;
            },
          }),
      }),
    );
    const full = wrapper.getComponent(VueyeTable);
    await wrapper.get('[aria-label="Add a grouping column"]').setValue("team");
    expect(grouping.value).toEqual(["region", "team"]);
    await wrapper.get('[aria-label="Group by Team earlier"]').trigger("click");
    expect(grouping.value).toEqual(["team", "region"]);
    await wrapper.get('[aria-label="Remove Region grouping"]').trigger("click");
    expect(grouping.value).toEqual(["team"]);
    await wrapper
      .get('[data-row-region="centre"] tr[data-key="3"] [aria-label="Pin to top, row 3"]')
      .trigger("click");
    expect(pinning.value).toEqual({ top: [1, 3], bottom: [5] });
    expect(wrapper.find('[data-row-region="top"] tr[data-key="3"]').exists()).toBe(true);
    expect(full.emitted("update:rowPinning")).toHaveLength(1);
    grouping.value = [];
    expanded.value = [];
    pinning.value = { top: [], bottom: [] };
    await nextTick();
    expect(full.emitted("update:grouping")).toHaveLength(3);
    expect(full.emitted("update:rowPinning")).toHaveLength(1);
    expect(wrapper.findAll("[data-group]")).toHaveLength(0);
    expect(wrapper.findAll("[data-row-pinned]")).toHaveLength(0);
    wrapper.unmount();
  });

  it("updates grouped aggregates through streaming and sorting without duplicating pins or mutating input", async () => {
    const wrapper = mount(VueyeTable, {
      props: { ...props, aggregatePosition: "footer", selectable: true },
    });
    const table = (wrapper.vm as unknown as VueyeTableExposed).table;
    await wrapper.get('[aria-label="Select Region: A, 1 row"]').setValue(true);
    expect(table.state.selection).toEqual([2]);
    async function* source() {
      yield { id: 6, name: "New", region: "A", team: "X", amount: 15 };
    }
    await table.stream(source(), { batchSize: 1 });
    await nextTick();
    expect(
      wrapper.get<HTMLInputElement>('[aria-label="Select Region: A, 2 rows"]').element
        .indeterminate,
    ).toBe(true);
    expect(wrapper.findAll('[data-aggregate="amount"]').map((cell) => cell.text())).toEqual([
      "35",
      "70",
    ]);
    table.toggleSort("amount");
    await nextTick();
    expect(wrapper.findAll('[data-row-region="top"] tr[data-key="1"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-row-region="bottom"] tr[data-key="5"]')).toHaveLength(1);
    expect(wrapper.get("table").attributes("aria-rowcount")).toBe("11");
    expect(data.map((row) => row.amount)).toEqual([10, 20, 30, 40, 50]);
    wrapper.unmount();
  });

  it("renders group values and aggregate strings as text in SSR", async () => {
    const app = createSSRApp(
      defineComponent({
        setup: () => () =>
          h(VueyeTable, {
            data: [{ id: 1, region: '<img src=x onerror="bad()">', amount: 5 }],
            columns: [{ id: "region" }, { id: "amount", aggregate: () => "<svg onload=bad()>" }],
            grouping: ["region"],
            aggregatePosition: "footer",
            pagination: false,
          }),
      }),
    );
    const html = await renderToString(app);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;svg");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<svg onload");
  });
});
