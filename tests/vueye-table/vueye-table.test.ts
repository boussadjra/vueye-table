import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import {
  VueyeGrid,
  VueyeTable,
  VueyeTablePlugin,
  createTable,
  defineColumns,
  type CellSlotProps,
} from "vueye-table";

import { people, type Person } from "../fixtures";

const columns = defineColumns<Person>([
  { id: "name.first", header: "First name" },
  { id: "age", align: "end" },
  { id: "city" },
]);

describe("VueyeTable", () => {
  it("renders untrusted default headers and cells as text in both full surfaces", () => {
    const text = '<img src=x onerror="alert(1)"><strong>untrusted</strong>';
    for (const component of [VueyeTable, VueyeGrid]) {
      const wrapper = mount(component, {
        props: { data: [{ id: 1, text }], columns: [{ id: "text", header: text }] },
      });
      expect(wrapper.get("thead").text()).toContain(text);
      expect(wrapper.get("tbody").text()).toContain(text);
      expect(wrapper.find("img, strong").exists()).toBe(false);
      wrapper.unmount();
    }
  });

  it("renders a full table with toolbar, status, and pagination", () => {
    const wrapper = mount(VueyeTable, { props: { data: people, columns, caption: "People" } });
    expect(wrapper.get("caption").text()).toBe("People");
    expect(wrapper.find(".vt-search").exists()).toBe(true);
    expect(wrapper.find(".vt-menu").exists()).toBe(true);
    expect(wrapper.findAll("tbody tr")).toHaveLength(5);
    expect(wrapper.get(".vt-status").text()).toBe("1–5 of 7 rows");
    expect(wrapper.findAll("thead th").map((th) => th.text())).toEqual([
      "First name",
      "Age",
      "City",
    ]);
  });

  it("infers columns when none are given", () => {
    const wrapper = mount(VueyeTable, { props: { data: people, pageSizeOptions: [10] } });
    expect(wrapper.findAll("thead th").map((th) => th.text())).toEqual([
      "Id",
      "Name first",
      "Name last",
      "Age",
      "City",
      "Active",
      "Joined",
    ]);
  });

  it("emits v-model updates for every piece of state", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data: people, columns, selectable: true, pageSizeOptions: [2, 5] },
    });
    await wrapper.get(".vt-pagination [aria-label='Next page']").trigger("click");
    expect(wrapper.emitted("update:page")?.at(-1)).toEqual([2]);
    await wrapper.get(".vt-page-size select").setValue("5");
    expect(wrapper.emitted("update:pageSize")?.at(-1)).toEqual([5]);
    await wrapper.findAll(".vt-sort-button")[1]?.trigger("click");
    expect(wrapper.emitted("update:sorting")?.at(-1)).toEqual([
      [{ column: "age", direction: "asc" }],
    ]);
    await wrapper.get(".vt-search input").setValue("bos");
    expect(wrapper.emitted("update:search")?.at(-1)).toEqual(["bos"]);
    await wrapper.findAll("tbody input[type=checkbox]")[0]?.trigger("change");
    expect(wrapper.emitted("update:selected")?.at(-1)).toEqual([[7]]);
    await wrapper.get("thead input[type=checkbox]").trigger("change");
    expect(wrapper.emitted("update:selected")?.at(-1)).toEqual([[7, 5]]);
    await wrapper.findAll(".vt-menu-panel input")[2]?.trigger("change");
    expect(wrapper.emitted("update:hiddenColumns")?.at(-1)).toEqual([["city"]]);
    expect(wrapper.emitted("state-change")?.length).toBeGreaterThan(5);
  });

  it("follows state the parent controls", async () => {
    const wrapper = mount(VueyeTable, {
      props: {
        data: people,
        columns,
        page: 2,
        pageSize: 2,
        search: "",
        filters: {},
        sorting: [],
        hiddenColumns: [],
        selected: [],
      },
    });
    expect(wrapper.get(".vt-status").text()).toBe("3–4 of 7 rows");
    await wrapper.setProps({ search: "boston" });
    expect(wrapper.get(".vt-status").text()).toBe("1–2 of 2 rows");
    await wrapper.setProps({ search: "", filters: { city: ["London"] } });
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
    await wrapper.setProps({
      filters: {},
      sorting: [{ column: "age", direction: "desc" }],
      page: 1,
    });
    expect(wrapper.get("tbody td").text()).toBe("Margaret");
    await wrapper.setProps({ hiddenColumns: ["city"] });
    expect(wrapper.findAll("thead th")).toHaveLength(2);
  });

  it("renders cell, header, toolbar, empty, and footer slots", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data: people, columns },
      slots: {
        "cell.age": ({ value, item }: CellSlotProps) =>
          h("b", `${String(value)}/${(item as Person).name.last}`),
        "header.city": ({ column }: { column: { header: string } }) =>
          h("i", column.header.toUpperCase()),
        toolbar: () => h("button", { class: "export" }, "Export"),
        footer: () => h("span", { class: "extra" }, "extra"),
        empty: () => "Nobody",
      },
    });
    expect(wrapper.get("tbody b").text()).toBe("36/Lovelace");
    expect(wrapper.get("thead i").text()).toBe("CITY");
    expect(wrapper.find(".export").exists()).toBe(true);
    expect(wrapper.find(".extra").exists()).toBe(true);
    await wrapper.get(".vt-search input").setValue("zzz");
    expect(wrapper.get("tbody td").text()).toBe("Nobody");
  });

  it("emits row clicks but not for the selection checkbox", async () => {
    const wrapper = mount(VueyeTable, { props: { data: people, columns, selectable: "single" } });
    expect(wrapper.find("thead input").exists()).toBe(false);
    await wrapper.findAll("tbody tr")[1]?.trigger("click");
    expect(wrapper.emitted("row-click")?.[0]?.[0]).toBe(people[1]);
    await wrapper.get("tbody td").trigger("click");
    expect(wrapper.emitted("row-click")).toHaveLength(1);
  });

  it("presents server pages with manual mode", () => {
    const wrapper = mount(VueyeTable, {
      props: {
        data: people.slice(0, 5),
        columns,
        manual: true,
        rowCount: 42,
        page: 3,
        pageSize: 5,
      },
    });
    expect(wrapper.get(".vt-status").text()).toBe("11–15 of 42 rows");
  });

  it("hides the chrome it is told to", () => {
    const wrapper = mount(VueyeTable, {
      props: {
        data: people,
        columns,
        searchable: false,
        columnToggle: false,
        pagination: false,
        loading: true,
        maxHeight: "10rem",
      },
    });
    expect(wrapper.find(".vt-toolbar").exists()).toBe(false);
    expect(wrapper.find(".vt-pagination").exists()).toBe(false);
    expect(wrapper.get(".vueye-table").attributes("aria-busy")).toBe("true");
    expect(wrapper.get(".vueye-table").attributes("style")).toContain("--vt-max-height: 10rem");
  });
});

describe("VueyeGrid", () => {
  it("edits cells into a new array through update:data", async () => {
    const wrapper = mount(VueyeGrid, {
      props: { data: people.slice(0, 3), columns, columnLetters: true },
      attachTo: document.body,
    });
    expect(wrapper.findAll("tbody tr")).toHaveLength(3);
    expect(wrapper.findAll(".vt-column-letter").map((letter) => letter.text())).toEqual([
      "A",
      "B",
      "C",
    ]);
    await wrapper.findAll("[role=gridcell]")[1]?.trigger("dblclick");
    await wrapper.get("input[data-editor]").setValue("40");
    await wrapper.get("input[data-editor]").trigger("keydown", { key: "Enter" });
    const [data] = (wrapper.emitted("update:data") ?? [])[0] as [readonly Person[]];
    expect(data[0]?.age).toBe(40);
    expect(people[0]?.age).toBe(36);
    expect(wrapper.emitted("edit")?.[0]?.[0]).toMatchObject([{ column: "age", value: 40 }]);
    await wrapper.setProps({ data });
    await nextTick();
    const [undo, redo, exportButton] = wrapper.findAll(".vueye-grid > .vt-toolbar button");
    expect(undo?.attributes("disabled")).toBeUndefined();
    await undo?.trigger("click");
    const latest = wrapper.emitted("update:data")?.at(-1)?.[0] as Person[] | undefined;
    expect(latest?.[0]?.age).toBe(36);
    expect(redo?.attributes("disabled")).toBeUndefined();
    await exportButton?.trigger("click");
    expect(String(wrapper.emitted("export")?.[0]?.[0])).toMatch(/^First name,Age,City\n/u);
    wrapper.unmount();
  });

  it("reports rejected input", async () => {
    const wrapper = mount(VueyeGrid, {
      props: { data: people.slice(0, 2), columns },
      attachTo: document.body,
    });
    await wrapper.findAll("[role=gridcell]")[1]?.trigger("dblclick");
    await wrapper.get("input[data-editor]").setValue("old");
    await wrapper.get("input[data-editor]").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("edit-error")?.[0]?.[0]).toMatchObject([{ code: "invalid_value" }]);
    wrapper.unmount();
  });

  it("locks every cell when not editable and pages when asked", async () => {
    const wrapper = mount(VueyeGrid, {
      props: {
        data: people,
        columns,
        editable: false,
        pagination: true,
        pageSizeOptions: [2],
        searchable: true,
        toolbar: false,
      },
    });
    expect(wrapper.findAll("[role=gridcell][data-readonly]")).toHaveLength(6);
    expect(wrapper.find(".vt-pagination").exists()).toBe(true);
    await wrapper.get(".vt-search input").setValue("ada");
    expect(wrapper.emitted("update:search")?.[0]).toEqual(["ada"]);
  });
});

describe("VueyeGrid state and slots", () => {
  it("keeps a page size the user picked while the parent controls the page", async () => {
    const wrapper = mount(VueyeGrid, {
      props: { data: people, columns, pagination: true, page: 1, pageSizeOptions: [2, 5] },
    });
    await wrapper.get(".vt-page-size select").setValue("5");
    expect(wrapper.emitted("update:pageSize")?.at(-1)).toEqual([5]);
    await wrapper.get(".vt-pagination [aria-label='Next page']").trigger("click");
    expect(wrapper.emitted("update:page")?.at(-1)).toEqual([2]);
    await wrapper.setProps({ page: 2 });
    expect(wrapper.findAll("tbody tr")).toHaveLength(2);
    expect(wrapper.get(".vt-status").text()).toBe("6–7 of 7 rows");
    expect(wrapper.emitted("state-change")?.length).toBeGreaterThan(1);
  });

  it("draws cell slots with the row's item and keeps the editor", async () => {
    const wrapper = mount(VueyeGrid, {
      props: { data: people.slice(0, 2), columns },
      slots: {
        "cell.age": `<template #cell.age="{ value, item, editable }"><b class="age">{{ value }}/{{ item.city }}/{{ editable }}</b></template>`,
      },
      attachTo: document.body,
    });
    expect(wrapper.findAll("b.age").map((cell) => cell.text())).toEqual([
      "36/London/true",
      "41/Wilmslow/true",
    ]);
    expect(wrapper.findAll("[role=gridcell]")[0]?.text()).toBe("Ada");
    await wrapper.findAll("[role=gridcell]")[1]?.trigger("dblclick");
    expect(wrapper.find("input[data-editor]").exists()).toBe(true);
    expect(wrapper.findAll("b.age")).toHaveLength(1);
    wrapper.unmount();
  });
});

describe("VueyeTable loading", () => {
  it("says it is loading instead of showing the empty state", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data: [], columns, loading: true, loadingText: "Fetching people…" },
      slots: { empty: "Nothing here" },
    });
    expect(wrapper.get("tbody").text()).toBe("Fetching people…");
    expect(wrapper.get(".vueye-table").attributes("aria-busy")).toBe("true");
    expect(wrapper.get(".vt-status").text()).toBe("Fetching people…");
    await wrapper.setProps({ loading: false });
    expect(wrapper.get("tbody").text()).toBe("Nothing here");
    expect(wrapper.get(".vt-status").text()).toBe("No rows");
  });

  it("lets the status line be rewritten", () => {
    const wrapper = mount(VueyeTable, {
      props: { data: people, columns, manual: true, rowCount: 12_000 },
      slots: {
        status: `<template #status="{ start, end, rowCount }">{{ start }}-{{ end }} of {{ rowCount.toLocaleString("en-US") }}</template>`,
      },
    });
    expect(wrapper.get(".vt-status").text()).toBe("1-7 of 12,000");
  });
});

describe("VueyeTablePlugin", () => {
  it("registers both components", () => {
    const app = createApp({ render: () => null });
    app.use(VueyeTablePlugin);
    expect(app.component("VueyeTable")).toBe(VueyeTable);
    expect(app.component("VueyeGrid")).toBe(VueyeGrid);
  });

  it("re-exports every layer from one package", () => {
    expect(typeof createTable).toBe("function");
  });
});
