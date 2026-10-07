import { mount } from "@vue/test-utils";
import { useDataGrid, useDataTable, injectDataTable, provideDataTable } from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, nextTick, ref, shallowRef, watch } from "vue";

import { people, type Person } from "../fixtures";

describe("useDataTable", () => {
  it("exposes snapshot fields as plain reactive properties", async () => {
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable<Person>({
        data: people,
        columns: [{ id: "name.first" }, { id: "age" }],
        initialState: { pagination: { page: 1, pageSize: 2 } },
      }),
    )!;
    expect(table.rows.map((row) => row.key)).toEqual([1, 2]);
    expect(table.pageCount).toBe(4);
    const seen: number[] = [];
    scope.run(() => {
      watch(
        () => table.page,
        (page) => seen.push(page),
      );
    });
    table.nextPage();
    await nextTick();
    expect(table.page).toBe(2);
    expect(seen).toEqual([2]);
    expect(Object.isFrozen(table)).toBe(true);
    scope.stop();
  });

  it("follows reactive data, columns, row count, and state", async () => {
    const data = shallowRef<readonly Person[]>(people);
    const columns = shallowRef([{ id: "city" as const }]);
    const state = ref({ search: "" });
    const rowCount = ref<number | undefined>(undefined);
    const scope = effectScope();
    const table = scope.run(() => useDataTable<Person>({ data, columns, state, rowCount }))!;
    data.value = people.slice(0, 2);
    await nextTick();
    expect(table.totalRowCount).toBe(2);
    columns.value = [{ id: "city" }, { id: "age" }] as never;
    await nextTick();
    expect(table.columns).toHaveLength(2);
    state.value.search = "wilm";
    await nextTick();
    expect(table.rowCount).toBe(1);
    rowCount.value = 50;
    await nextTick();
    scope.stop();
    data.value = people;
    await nextTick();
    expect(table.totalRowCount).toBe(2);
  });

  it("provides the table to descendants and explains a missing provider", () => {
    const Child = defineComponent({
      setup() {
        const table = injectDataTable<Person>("<Child>");
        return () => h("span", String(table.rowCount));
      },
    });
    const Parent = defineComponent({
      setup() {
        provideDataTable(useDataTable<Person>({ data: people, columns: [] }));
        return () => h(Child);
      },
    });
    expect(mount(Parent).text()).toBe("7");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => mount(Child)).toThrow(/<Child> needs a table/u);
    warn.mockRestore();
  });
});

describe("useDataGrid", () => {
  function setup() {
    const scope = effectScope();
    const onDataChange = vi.fn<(data: readonly Person[]) => void>();
    const table = scope.run(() =>
      useDataTable<Person>({
        data: people.slice(0, 3),
        columns: [
          { id: "name.first", editable: true },
          { id: "age", editable: true },
          { id: "city" },
        ],
        onDataChange,
      }),
    )!;
    const grid = scope.run(() => useDataGrid(table))!;
    return { table, grid, onDataChange };
  }

  it("navigates with keys and selects ranges", () => {
    const { grid } = setup();
    expect(grid.handleKey({ key: "ArrowDown" })).toBe(true);
    expect(grid.selection?.focus).toEqual({ row: 1, column: 0 });
    grid.handleKey({ key: "ArrowRight", shiftKey: true });
    expect(grid.range).toEqual({ top: 1, left: 0, bottom: 1, right: 1 });
    expect(grid.isSelected({ row: 1, column: 1 })).toBe(true);
    expect(grid.isFocused({ row: 1, column: 1 })).toBe(true);
    grid.handleKey({ key: "Escape" });
    expect(grid.range).toEqual({ top: 1, left: 1, bottom: 1, right: 1 });
    grid.handleKey({ key: "a", ctrlKey: true });
    expect(grid.range).toEqual({ top: 0, left: 0, bottom: 2, right: 2 });
    grid.focusCell({ row: 9, column: 9 });
    expect(grid.selection?.focus).toEqual({ row: 2, column: 2 });
    grid.focusCell({ row: 0, column: 0 }, { extend: true });
    expect(grid.range).toEqual({ top: 0, left: 0, bottom: 2, right: 2 });
    expect(grid.handleKey({ key: "Shift" })).toBe(false);
    expect(grid.cellAt({ row: 5, column: 0 })).toBeUndefined();
  });

  it("edits a cell from typing and commits through the table", () => {
    const { grid, table, onDataChange } = setup();
    grid.focusCell({ row: 0, column: 1 });
    expect(grid.handleKey({ key: "4" })).toBe(true);
    expect(grid.editor).toEqual({ position: { row: 0, column: 1 }, draft: "4" });
    expect(grid.handleKey({ key: "ArrowDown" })).toBe(false);
    grid.updateDraft("42");
    const result = grid.commitEdit("down");
    expect(result?.status).toBe("applied");
    expect(table.rows[0]?.original.age).toBe(42);
    expect(grid.selection?.focus).toEqual({ row: 1, column: 1 });
    expect(onDataChange).toHaveBeenCalledOnce();
    expect(grid.handleKey({ key: "z", ctrlKey: true })).toBe(true);
    expect(table.rows[0]?.original.age).toBe(36);
    expect(grid.handleKey({ key: "y", ctrlKey: true })).toBe(true);
    expect(grid.commitEdit()).toBeUndefined();
  });

  it("starts editing with the current text, cancels, and refuses read-only cells", () => {
    const { grid } = setup();
    grid.focusCell({ row: 0, column: 0 });
    expect(grid.handleKey({ key: "Enter" })).toBe(true);
    expect(grid.editor?.draft).toBe("Ada");
    expect(grid.isEditing({ row: 0, column: 0 })).toBe(true);
    grid.cancelEdit();
    expect(grid.editor).toBeUndefined();
    grid.updateDraft("ignored");
    grid.focusCell({ row: 0, column: 2 });
    expect(grid.startEdit()).toBe(false);
  });

  it("commits a pending edit when focus moves to another cell", () => {
    const { grid, table } = setup();
    grid.focusCell({ row: 0, column: 0 });
    grid.startEdit("Augusta");
    grid.focusCell({ row: 1, column: 0 });
    expect(table.rows[0]?.original.name.first).toBe("Augusta");
  });

  it("copies, pastes, and clears the selected range", () => {
    const { grid, table } = setup();
    expect(grid.copy()).toBe("");
    expect(grid.paste("x")).toBeUndefined();
    expect(grid.clear()).toBeUndefined();
    grid.focusCell({ row: 0, column: 0 });
    grid.move("right", { extend: true });
    expect(grid.copy()).toBe("Ada\t36");
    grid.focusCell({ row: 1, column: 0 });
    expect(grid.paste("Alonzo\t50")?.status).toBe("applied");
    expect(table.rows[1]?.original.age).toBe(50);
    grid.focusCell({ row: 1, column: 1 });
    grid.handleKey({ key: "Delete" });
    expect(table.rows[1]?.original.age).toBeNull();
    grid.focusCell({ row: 0, column: 2 });
    expect(grid.clear()?.status).toBe("unchanged");
    expect(grid.lastResult?.status).toBe("unchanged");
  });

  it("forwards paste limits and optional clipboard escaping through the bindings", () => {
    const scope = effectScope();
    const { table, grid } = scope.run(() => {
      const binding = useDataTable({
        data: [
          { id: 1, value: "=1+1" },
          { id: 2, value: "original" },
        ],
        columns: [{ id: "value", editable: true }],
        pasteLimit: { maxCells: 1 },
      });
      return { table: binding, grid: useDataGrid(binding) };
    })!;
    grid.focusCell({ row: 0, column: 0 });
    expect(grid.copy()).toBe("=1+1");
    expect(grid.copy({ escapeFormulas: true })).toBe("'=1+1");
    expect(table.exportRows({ headers: false })).toBe("'=1+1\noriginal");
    const result = grid.paste("next\nignored");
    expect(result?.status).toBe("partial");
    expect(result?.issues[0]?.code).toBe("paste_truncated");
    expect(grid.lastResult).toBe(result);
    expect(table.rows.map((row) => row.original.value)).toEqual(["next", "original"]);
    scope.stop();
  });

  it("keeps the selection on cells that exist when the grid shrinks", async () => {
    const { grid, table } = setup();
    grid.focusCell({ row: 1, column: 1 });
    grid.focusCell({ row: 2, column: 2 }, { extend: true });
    grid.startEdit("50");
    table.search("ada");
    await nextTick();
    expect(table.rows).toHaveLength(1);
    expect(grid.selection).toEqual({ anchor: { row: 0, column: 1 }, focus: { row: 0, column: 2 } });
    expect(grid.editor).toBeUndefined();
    table.search("nobody");
    await nextTick();
    expect(grid.selection).toBeUndefined();
    expect(grid.range).toBeUndefined();
  });

  it("does nothing on an empty grid", () => {
    const scope = effectScope();
    const table = scope.run(() => useDataTable<Person>({ data: [], columns: [{ id: "city" }] }))!;
    const grid = scope.run(() => useDataGrid(table))!;
    grid.move("down");
    grid.selectAll();
    expect(grid.selection).toBeUndefined();
    expect(grid.startEdit()).toBe(false);
  });
});
