import type { TableColumn, TableRow } from "@vueye-table/core";
import { DataGridCell, DataGridRoot } from "@vueye-table/headless";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";

import { people, type Person } from "../fixtures";
import { mountWithTable } from "../helpers";

function clipboard(text = "") {
  const store = new Map<string, string>([["text/plain", text]]);
  return {
    getData: (type: string) => store.get(type) ?? "",
    setData: (type: string, value: string) => store.set(type, value),
    store,
  };
}

function mountGrid() {
  const onDataChange = vi.fn<(data: readonly Person[]) => void>();
  const result = mountWithTable<Person>(
    {
      data: people.slice(0, 3),
      columns: [
        { id: "name.first", editable: true },
        { id: "age", editable: true },
        { id: "city" },
      ],
      onDataChange,
    },
    (table) => h(DataGridRoot, { table, label: "People" }),
    document.body,
  );
  return { ...result, onDataChange };
}

describe("DataGridRoot", () => {
  it("renders a grid that tracks the active cell", async () => {
    const { wrapper } = mountGrid();
    const grid = wrapper.get("[role=grid]");
    expect(grid.attributes("tabindex")).toBe("0");
    expect(grid.attributes("aria-label")).toBe("People");
    expect(wrapper.findAll("[role=gridcell]")).toHaveLength(9);
    expect(wrapper.findAll("[role=gridcell]")[2]?.attributes("aria-readonly")).toBe("true");
    await grid.trigger("keydown", { key: "ArrowDown" });
    const active = grid.attributes("aria-activedescendant");
    expect(active).toMatch(/-r1-c0$/u);
    expect(wrapper.get(`#${active}`).attributes("data-focused")).toBe("");
    await grid.trigger("keydown", { key: "ArrowRight", shiftKey: true });
    expect(wrapper.findAll("[data-selected]")).toHaveLength(2);
    wrapper.unmount();
  });

  it("edits a cell with a double click and Enter", async () => {
    const { wrapper, table, onDataChange } = mountGrid();
    const cell = wrapper.findAll("[role=gridcell]")[1];
    await cell?.trigger("dblclick");
    const input = wrapper.get("input[data-editor]");
    expect((input.element as HTMLInputElement).value).toBe("36");
    expect(document.activeElement).toBe(input.element);
    await input.setValue("37");
    await input.trigger("keydown", { key: "Enter" });
    expect(table().rows[0]?.original.age).toBe(37);
    expect(onDataChange).toHaveBeenCalledOnce();
    expect(wrapper.find("input[data-editor]").exists()).toBe(false);
    await nextTick();
    expect(document.activeElement).toBe(wrapper.get("[role=grid]").element);
    wrapper.unmount();
  });

  it("does not let queued pointer focus steal a newly mounted editor", async () => {
    const { wrapper, onDataChange } = mountGrid();
    const cell = wrapper.get('[role=gridcell][data-column="age"]');
    cell.element.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    cell.element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await nextTick();
    await nextTick();
    const input = wrapper.get("input[data-editor]");
    expect(document.activeElement).toBe(input.element);
    expect(onDataChange).not.toHaveBeenCalled();
    await input.setValue("37");
    await input.trigger("keydown", { key: "Enter" });
    expect(onDataChange).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("focuses the grid without browser scrolling during pointer selection", async () => {
    const { wrapper } = mountGrid();
    const grid = wrapper.get("[role=grid]");
    const focus = vi.spyOn(grid.element as HTMLElement, "focus");
    await wrapper.get('[role=gridcell][data-column="age"]').trigger("mousedown", { button: 0 });
    expect(document.activeElement).toBe(grid.element);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    wrapper.unmount();
  });

  it("types into a cell, tabs across, and cancels with Escape", async () => {
    const { wrapper, table } = mountGrid();
    const grid = wrapper.get("[role=grid]");
    await wrapper.findAll("[role=gridcell]")[0]?.trigger("mousedown", { button: 0 });
    await grid.trigger("keydown", { key: "Z" });
    const input = wrapper.get("input[data-editor]");
    expect((input.element as HTMLInputElement).value).toBe("Z");
    await input.setValue("Zed");
    await input.trigger("keydown", { key: "Tab" });
    expect(table().rows[0]?.original.name.first).toBe("Zed");
    expect(grid.attributes("aria-activedescendant")).toMatch(/-r0-c1$/u);
    await grid.trigger("keydown", { key: "Enter" });
    await wrapper.get("input[data-editor]").trigger("keydown", { key: "Escape" });
    expect(wrapper.find("input[data-editor]").exists()).toBe(false);
    expect(table().rows[0]?.original.age).toBe(36);
    await grid.trigger("keydown", { key: "Enter" });
    await wrapper.get("input[data-editor]").trigger("blur");
    expect(wrapper.find("input[data-editor]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("extends the selection by shift-click and by dragging", async () => {
    const { wrapper } = mountGrid();
    const cells = () => wrapper.findAll("[role=gridcell]");
    await cells()[0]?.trigger("mousedown", { button: 0 });
    await cells()[4]?.trigger("mousedown", { button: 0, shiftKey: true });
    expect(wrapper.findAll("[data-selected]")).toHaveLength(4);
    await cells()[8]?.trigger("mouseenter", { buttons: 1 });
    expect(wrapper.findAll("[data-selected]")).toHaveLength(9);
    await cells()[0]?.trigger("mousedown", { button: 2 });
    expect(wrapper.findAll("[data-selected]")).toHaveLength(9);
    wrapper.unmount();
  });

  it("copies, cuts, and pastes through clipboard events", async () => {
    const { wrapper, table } = mountGrid();
    const grid = wrapper.get("[role=grid]");
    await wrapper.findAll("[role=gridcell]")[0]?.trigger("mousedown", { button: 0 });
    await grid.trigger("keydown", { key: "ArrowRight", shiftKey: true });

    const copied = clipboard();
    await grid.trigger("copy", { clipboardData: copied });
    expect(copied.store.get("text/plain")).toBe("Ada\t36");

    const cut = clipboard();
    await grid.trigger("cut", { clipboardData: cut });
    expect(cut.store.get("text/plain")).toBe("Ada\t36");
    expect(table().rows[0]?.original.age).toBeNull();

    await grid.trigger("paste", { clipboardData: clipboard("Augusta\t99") });
    expect(table().rows[0]?.original.name.first).toBe("Augusta");
    expect(table().rows[0]?.original.age).toBe(99);
    await grid.trigger("paste", { clipboardData: clipboard("") });
    wrapper.unmount();
  });

  it("renders custom cell and editor slots", async () => {
    const { wrapper } = mountWithTable<Person>(
      { data: people.slice(0, 1), columns: [{ id: "city", editable: true }] },
      (table) =>
        h(DataGridRoot, { table }, () =>
          h("tbody", [
            h("tr", [
              h(
                DataGridCell,
                {
                  row: table.rows[0] as TableRow<Person>,
                  column: table.columns[0] as TableColumn<Person>,
                },
                {
                  default: ({ display, editable }: { display: string; editable: boolean }) =>
                    `${display}${editable ? "*" : ""}`,
                  editor: ({ draft, commit }: { draft: string; commit: () => void }) =>
                    h("button", { class: "save", onClick: () => commit() }, draft),
                },
              ),
            ]),
          ]),
        ),
    );
    expect(wrapper.get("td").text()).toBe("London*");
    await wrapper.get("td").trigger("dblclick");
    expect(wrapper.get(".save").text()).toBe("London");
    await wrapper.get(".save").trigger("click");
    expect(wrapper.find(".save").exists()).toBe(false);
  });

  it("ignores keys aimed at controls inside the grid", async () => {
    const { wrapper } = mountGrid();
    const grid = wrapper.get("[role=grid]");
    await grid.find("button").trigger("keydown", { key: "ArrowDown" });
    expect(grid.attributes("aria-activedescendant")).toBeUndefined();
    wrapper.unmount();
  });
});
