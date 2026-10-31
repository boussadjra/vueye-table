import { useDataGrid, useDataTable } from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";

const data = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, amount: (index + 1) * 10 }));
describe("pinned row bindings", () => {
  it("forwards controlled pinning and exposes reactive regions without echoing external state", async () => {
    const state = ref({ rowPinning: { top: [4], bottom: [5] } });
    const onStateChange = vi.fn<() => void>();
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data,
        columns: [{ id: "amount", editable: true }],
        state,
        onStateChange,
        initialState: { pagination: { page: 1, pageSize: 2 } },
      }),
    )!;
    expect(table.gridRows.map((row) => row.key)).toEqual([4, 1, 2, 5]);
    table.pinRow(1, "top");
    expect(table.topRows.map((row) => row.key)).toEqual([4, 1]);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    state.value = { rowPinning: { top: [], bottom: [2] } };
    await nextTick();
    expect(table.bottomRows[0]?.key).toBe(2);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    scope.stop();
  });
  it("navigates, selects and pastes across regions, preserving focus when a row is pinned", () => {
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data,
        columns: [{ id: "amount", editable: true }],
        initialState: {
          rowPinning: { top: [4], bottom: [5] },
          pagination: { page: 1, pageSize: 2 },
        },
      }),
    )!;
    const grid = scope.run(() => useDataGrid(table))!;
    expect(grid.bounds.value.rows).toBe(4);
    grid.focusCell({ row: 0, column: 0 });
    grid.handleKey({ key: "ArrowDown" });
    expect(grid.cellAt(grid.selection!.focus)?.row.key).toBe(1);
    table.pinRow(2, "top");
    expect(grid.cellAt(grid.selection!.focus)?.row.key).toBe(1);
    expect(grid.selection?.focus.row).toBe(2);
    grid.focusCell({ row: 3, column: 0 });
    grid.handleKey({ key: "ArrowDown" });
    expect(grid.cellAt(grid.selection!.focus)?.row.key).toBe(5);
    grid.selectAll();
    expect(grid.copy()).toBe("40\n20\n10\n30\n50");
    expect(grid.paste("41\n21\n11\n31\n51")?.changes.map((change) => change.rowKey)).toEqual([
      4, 2, 1, 3, 5,
    ]);
    expect(table.bottomRows[0]?.original.amount).toBe(51);
    scope.stop();
  });
  it("keeps row drafts and pending metadata attached to keys through pin changes", async () => {
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({ data, columns: [{ id: "amount", editable: true }] }),
    )!;
    const draft = table.editRow(4);
    draft.values.amount = 80;
    table.pinRow(4, "bottom");
    expect((await draft.save()).status).toBe("applied");
    expect(table.bottomRows[0]?.original.amount).toBe(80);
    expect(table.bottomRows[0]?.isDirty).toBe(true);
    table.markSaved([4]);
    expect(table.bottomRows[0]?.isDirty).toBe(false);
    table.pinRow(4, false);
    expect(table.getRow(4)?.original.amount).toBe(80);
    scope.stop();
  });
});
