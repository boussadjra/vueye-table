import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mount } from "@vue/test-utils";
import {
  icon,
  VtColumnVisibility,
  VtEmpty,
  VtGrid,
  VtPageSize,
  VtPagination,
  VtSearch,
  VtStatus,
  VtTable,
  VtToolbar,
} from "@vueye-table/styled";
import { describe, expect, it } from "vitest";
import { h } from "vue";

import { people, type Person } from "../fixtures";
import { mountWithTable } from "../helpers";

const options = {
  data: people,
  columns: [
    { id: "name.first" as const },
    { id: "age" as const },
    { id: "city" as const, sortable: false },
  ],
  initialState: { pagination: { page: 1, pageSize: 3 } },
};

describe("VtTable", () => {
  it("renders a themed surface with sort indicators", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(VtTable, {
        table: t,
        density: "compact",
        striped: true,
        stickyHeader: true,
        loading: true,
        theme: "dark",
      }),
    );
    const surface = wrapper.get(".vt-surface");
    expect(surface.attributes("data-density")).toBe("compact");
    expect(surface.attributes("data-striped")).toBe("");
    expect(surface.attributes("data-vt-theme")).toBe("dark");
    expect(surface.attributes("aria-busy")).toBe("true");
    expect(wrapper.findAll(".vt-sort-indicator")).toHaveLength(2);
    await wrapper.findAll(".vt-sort-button")[0]?.trigger("click");
    expect(wrapper.find(".vt-sort-indicator[data-active]").exists()).toBe(true);
    await wrapper.findAll(".vt-sort-button")[1]?.trigger("click", { shiftKey: true });
    expect(wrapper.findAll(".vt-sort-priority").map((badge) => badge.text())).toEqual(["1", "2"]);
    table().search("nobody");
    await wrapper.vm.$nextTick();
    expect(wrapper.get(".vt-empty").text()).toBe("No matching rows");
  });

  it("composes controls around the table", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(VtTable, { table: t }, () => []),
    );
    expect(wrapper.find("tbody").exists()).toBe(false);
    const controls = mountWithTable<Person>(options, (t) => [
      h(VtTable, { table: t }),
      h(VtToolbar, () => [
        h(VtSearch, { placeholder: "Find" }),
        h(VtColumnVisibility),
        h(VtPageSize),
        h(VtStatus),
        h(VtPagination),
      ]),
    ]);
    await controls.wrapper.get(".vt-search input").setValue("ada");
    expect(controls.table().rowCount).toBe(1);
    expect(controls.wrapper.get(".vt-menu summary").text()).toBe("Columns");
    expect(controls.wrapper.get(".vt-page-size span").text()).toBe("Rows per page");
    expect(controls.wrapper.get(".vt-status").text()).toBe("1–1 of 1 rows");
    expect(controls.wrapper.get(".vt-pagination").element.tagName).toBe("NAV");
    expect(table().rowCount).toBe(7);
  });

  it("closes the column menu on Escape and when focus leaves it", async () => {
    const { wrapper } = mountWithTable(
      options,
      () => [h(VtColumnVisibility), h("button", { class: "outside" }, "Elsewhere")],
      document.body,
    );
    const menu = wrapper.get("details.vt-menu");
    const details = menu.element as HTMLDetailsElement;
    details.open = true;
    await menu.trigger("keydown", { key: "Escape" });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(wrapper.get("summary").element);
    details.open = true;
    await wrapper.get(".vt-menu-panel input").trigger("focusout", { relatedTarget: null });
    expect(details.open).toBe(true);
    await wrapper
      .get(".vt-menu-panel input")
      .trigger("focusout", { relatedTarget: wrapper.get(".outside").element });
    expect(details.open).toBe(false);
    wrapper.unmount();
  });

  it("renders an empty state with custom text", () => {
    expect(mount(VtEmpty, { props: { text: "Nothing" } }).text()).toBe("Nothing");
    expect(mount(VtEmpty, { slots: { default: () => "Custom" } }).text()).toBe("Custom");
    expect(
      mount({ render: () => icon("search") })
        .get("svg")
        .attributes("aria-hidden"),
    ).toBe("true");
  });
});

describe("VtGrid", () => {
  it("adds row numbers and column letters", () => {
    const { wrapper } = mountWithTable<Person>(options, (t) =>
      h(VtGrid, { table: t, columnLetters: true }),
    );
    expect(wrapper.get("[role=grid]").classes()).toContain("vt-grid");
    expect(wrapper.findAll(".vt-column-letter").map((letter) => letter.text())).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(wrapper.findAll("tbody .vt-row-number").map((cell) => cell.text())).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("can drop row numbers or render its own content", () => {
    const plain = mountWithTable<Person>(options, (t) =>
      h(VtGrid, { table: t, rowNumbers: false }),
    );
    expect(plain.wrapper.find(".vt-row-number").exists()).toBe(false);
    const custom = mountWithTable<Person>(options, (t) =>
      h(VtGrid, { table: t }, () => [h("tbody", h("tr", h("td", "custom")))]),
    );
    expect(custom.wrapper.get("td").text()).toBe("custom");
  });
});

describe("style.css", () => {
  it("defines light and dark tokens", () => {
    const css = readFileSync(resolve("packages/styled/src/style.css"), "utf8");
    expect(css).toContain("--vt-accent:");
    expect(css).toContain('[data-vt-theme="dark"]');
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("prefers-reduced-motion");
  });
});
