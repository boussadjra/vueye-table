import type { ColumnDef, TableStatePatch } from "@vueye-table/core";
import { useDataGrid, useDataTable, type LayoutState } from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, shallowRef, watch } from "vue";

const data = [
  { id: 1, team: "A", score: 10 },
  { id: 2, team: "B", score: 20 },
];
const columns: readonly ColumnDef<(typeof data)[number]>[] = [
  { id: "id", width: 80 },
  { id: "team", width: 120 },
  { id: "score", width: 100 },
];

describe("reactive layout bindings", () => {
  it("round-trips every layout field through controlled state without callback echoes", async () => {
    const scope = effectScope();
    const state = shallowRef<TableStatePatch>({});
    const onStateChange = vi.fn<(next: TableStatePatch) => void>((next) => {
      state.value = next;
    });
    const table = scope.run(() => useDataTable({ data, columns, state, onStateChange }))!;
    const grid = scope.run(() => useDataGrid(table))!;
    const observed: LayoutState["rowPinning"][] = [];
    scope.run(() =>
      watch(
        () => grid.rowPinning,
        (next) => observed.push(next),
      ),
    );
    grid.resizeColumn("team", 180);
    await nextTick();
    expect(grid.columnSizing).toEqual({ team: 180 });
    grid.pinColumn("team", "start");
    await nextTick();
    expect(grid.columnPinning).toEqual({ start: ["team"], end: [] });
    expect(grid.pinnedStartWidth).toBe(180);
    grid.pinRow(1, "top");
    await nextTick();
    expect(grid.rowPinning).toEqual({ top: [1], bottom: [] });
    expect(grid.topRows[0]?.key).toBe(1);
    grid.pinRow(2, "bottom");
    await nextTick();
    expect(grid.bottomRows[0]?.key).toBe(2);
    grid.pinRow(2, false);
    grid.setGrouping(["team"]);
    await nextTick();
    expect(grid.grouping).toEqual(["team"]);
    grid.collapseAllGroups();
    await nextTick();
    expect(grid.expandedGroups).toEqual([]);
    const group = table.renderItems[0]!;
    if (group.kind !== "group") throw Error("Expected group");
    grid.toggleGroup(group.key);
    await nextTick();
    expect(grid.expandedGroups).toEqual([group.key]);
    grid.expandAllGroups();
    grid.resetColumnSize("team");
    await nextTick();
    expect(grid.expandedGroups).toBe(true);
    expect(grid.columnSizing).toEqual({});
    expect(grid.pinnedStartWidth).toBe(120);
    expect(onStateChange).toHaveBeenCalledTimes(10);
    expect(observed).toHaveLength(3);
    for (const key of [
      "columnSizing",
      "columnPinning",
      "grouping",
      "expandedGroups",
      "rowPinning",
    ] as const) {
      expect(grid[key]).toBe(table[key]);
      expect(table[key]).toBe(table.state[key]);
      expect(Object.isFrozen(table[key])).toBe(true);
    }
    state.value = {
      columnSizing: { score: 140 },
      columnPinning: { start: [], end: ["score"] },
      grouping: [],
      expandedGroups: [],
      rowPinning: { top: [], bottom: [1] },
    };
    await nextTick();
    expect(grid.pinnedEndWidth).toBe(140);
    expect(grid.bottomRows[0]?.key).toBe(1);
    expect(grid.grouping).toEqual([]);
    expect(onStateChange).toHaveBeenCalledTimes(10);
    scope.stop();
  });

  it("applies reactive layout options and columns, with controlled state taking precedence", async () => {
    const scope = effectScope();
    const definitions = shallowRef(columns);
    const layout = ref<LayoutState>({
      columnSizing: { team: 150 },
      columnPinning: { start: ["team"], end: [] },
      grouping: ["team"],
      expandedGroups: true,
      rowPinning: { top: [1], bottom: [] },
    });
    const state = shallowRef<TableStatePatch>({ columnSizing: { team: 170 } });
    const onStateChange = vi.fn<() => void>();
    const table = scope.run(() =>
      useDataTable({
        data,
        columns: definitions,
        state,
        onStateChange,
        initialState: { grouping: [] },
        columnSizing: () => layout.value.columnSizing,
        columnPinning: () => layout.value.columnPinning,
        grouping: () => layout.value.grouping,
        expandedGroups: () => layout.value.expandedGroups,
        rowPinning: () => layout.value.rowPinning,
      }),
    )!;
    expect(table.pinnedStartWidth).toBe(170);
    expect(table.grouping).toEqual(["team"]);
    layout.value = {
      columnSizing: { score: 190 },
      columnPinning: { start: [], end: ["score"] },
      grouping: [],
      expandedGroups: [],
      rowPinning: { top: [], bottom: [2] },
    };
    state.value = {};
    definitions.value = [...columns, { id: "extra", accessor: () => "extra", width: 90 }];
    await nextTick();
    expect(table.columns.map((column) => column.id)).toEqual(["id", "team", "extra", "score"]);
    expect(table.columnSizing).toEqual({ score: 190 });
    expect(table.pinnedEndWidth).toBe(190);
    expect(table.grouping).toEqual([]);
    expect(table.expandedGroups).toEqual([]);
    expect(table.bottomRows[0]?.key).toBe(2);
    expect(onStateChange).not.toHaveBeenCalled();
    const snapshot = table.snapshot;
    scope.stop();
    layout.value = { ...layout.value, grouping: ["team"] };
    definitions.value = columns;
    await nextTick();
    expect(table.snapshot).toBe(snapshot);
  });
});
