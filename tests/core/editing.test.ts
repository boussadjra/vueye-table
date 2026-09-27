import { createTable } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

import { people, type Person } from "../fixtures";

function sheet(
  onDataChange = vi.fn<(data: readonly Person[]) => void>(),
  onEditIssues = vi.fn<(issues: readonly unknown[]) => void>(),
) {
  const table = createTable<Person>({
    data: people.slice(0, 3),
    columns: [
      { id: "name.first", editable: true },
      { id: "age", editable: true },
      { id: "city", editable: (row) => row.active },
      { id: "full", accessor: (row) => `${row.name.first} ${row.name.last}`, editable: true },
      {
        id: "last",
        accessor: (row) => row.name.last,
        setValue: (row, value) => ({ ...row, name: { ...row.name, last: String(value) } }),
        editable: true,
      },
    ],
    onDataChange,
    onEditIssues,
  });
  return { table, onDataChange, onEditIssues };
}

describe("editing", () => {
  it("parses input, writes a new array, and never mutates the original", () => {
    const { table, onDataChange } = sheet();
    const original = people[0];
    const result = table.edit({ rowKey: 1, column: "age", input: "37" });
    expect(result.status).toBe("applied");
    expect(result.changes[0]).toMatchObject({ rowKey: 1, column: "age", previous: 36, value: 37 });
    expect(table.getSnapshot().getRow(1)?.original.age).toBe(37);
    expect(people[0]).toBe(original);
    expect(people[0]?.age).toBe(36);
    expect(onDataChange).toHaveBeenCalledOnce();
    const [data] = onDataChange.mock.calls[0] as [readonly Person[]];
    expect(data).not.toBe(people);
    expect(data[1]).toBe(people[1]);
  });

  it("accepts typed values and skips unchanged cells", () => {
    const { table, onDataChange } = sheet();
    expect(table.edit({ rowKey: 1, column: "age", value: 36 }).status).toBe("unchanged");
    expect(table.edit([{ rowKey: 1, column: "last", value: "King" }]).status).toBe("applied");
    expect(table.getSnapshot().getRow(1)?.getDisplay("full")).toBe("Ada King");
    expect(onDataChange).toHaveBeenCalledOnce();
  });

  it("refuses read-only, unknown, and invalid cells with a reason for each", () => {
    const { table, onEditIssues } = sheet();
    const result = table.edit([
      { rowKey: 2, column: "city", input: "Manchester" },
      { rowKey: 1, column: "full", input: "x" },
      { rowKey: 99, column: "age", input: "1" },
      { rowKey: 1, column: "ghost", input: "1" },
      { rowKey: 1, column: "age", input: "old" },
      { rowKey: 1, column: "city", input: "Paris" },
    ]);
    expect(result.status).toBe("partial");
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "read_only_cell",
      "read_only_cell",
      "unknown_row",
      "unknown_column",
      "invalid_value",
    ]);
    expect(onEditIssues).toHaveBeenCalledWith(result.issues);
    expect(table.edit({ rowKey: 2, column: "city", input: "x" }).status).toBe("rejected");
  });

  it("undoes and redoes batches", () => {
    const { table } = sheet();
    table.edit([
      { rowKey: 1, column: "age", input: "1" },
      { rowKey: 2, column: "age", input: "2" },
    ]);
    table.edit({ rowKey: 3, column: "name.first", input: "Rear Admiral" });
    expect(table.getSnapshot().canUndo).toBe(true);
    expect(table.undo()).toBe(true);
    expect(table.getSnapshot().getRow(3)?.original.name.first).toBe("Grace");
    expect(table.undo()).toBe(true);
    expect(table.getSnapshot().getRow(2)?.original.age).toBe(41);
    expect(table.undo()).toBe(false);
    expect(table.getSnapshot().canRedo).toBe(true);
    expect(table.redo()).toBe(true);
    expect(table.getSnapshot().getRow(1)?.original.age).toBe(1);
    table.edit({ rowKey: 1, column: "age", input: "5" });
    expect(table.redo()).toBe(false);
  });

  it("clears history when outside data replaces the table's own", () => {
    const { table } = sheet();
    table.edit({ rowKey: 1, column: "age", input: "1" });
    table.setData(people);
    expect(table.getSnapshot().canUndo).toBe(false);
  });

  it("copies, pastes, and clears ranges of shown cells", () => {
    const { table } = sheet();
    expect(table.copy({ top: 0, left: 0, bottom: 1, right: 1 })).toBe("Ada\t36\nAlan\t41");
    const pasted = table.paste({ row: 1, column: 0 }, "Alonzo\t50\nGrace\t86\nExtra\t1\n");
    expect(pasted.changes.map((change) => change.value)).toEqual(["Alonzo", 50, 86]);
    expect(table.getSnapshot().getRow(2)?.original.name.first).toBe("Alonzo");
    const cleared = table.clear({ top: 0, left: 1, bottom: 0, right: 2 });
    expect(cleared.changes.map((change) => [change.column, change.value])).toEqual([
      ["age", null],
      ["city", ""],
    ]);
    expect(cleared.issues).toEqual([]);
  });
});
