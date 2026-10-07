import { createTable, type ValidationResult } from "@vueye-table/core";
import { expect, it } from "vitest";

it("copies row expectations, rejects stale batches, and keeps their completions isolated from snapshots", async () => {
  const original = { id: 1, value: 2 };
  let resolve!: (result: ValidationResult) => void;
  const request = new Promise<ValidationResult>((done) => {
    resolve = done;
  });
  const table = createTable({
    data: [original, { id: 2, value: 2 }],
    columns: [{ id: "value", editable: true, validate: (value) => (value === 3 ? request : true) }],
  });
  const stale = table.edit(
    { rowKey: 1, column: "value", value: 3 },
    { expectedRows: new Map([[1, { ...original }]]) },
  );
  expect(stale.status).toBe("rejected");
  expect(stale.issues[0]?.code).toBe("stale_draft");
  const expected = new Map([[1, original]]);
  const result = table.edit(
    [
      { rowKey: 1, column: "value", value: 3 },
      { rowKey: 2, column: "value", value: 3 },
    ],
    { expectedRows: expected },
  );
  expected.clear();
  table.edit({ rowKey: 1, column: "value", value: 4 });
  resolve(true);
  const final = await result.completion;
  expect(final?.status).toBe("partial");
  expect(final?.issues[0]?.code).toBe("stale_draft");
  expect(table.getSnapshot().getRow(1)?.original.value).toBe(4);
  expect(table.getSnapshot().getRow(2)?.original.value).toBe(3);
  expect(table.getSnapshot().issues).toEqual([]);
  expect(final?.pendingCells).toEqual([]);
});

it("resolves fully cancelled completions without notifying a destroyed table", async () => {
  let resolve!: (result: ValidationResult) => void;
  const table = createTable({
    data: [{ id: 1, value: 2 }],
    columns: [
      {
        id: "value",
        editable: true,
        validate: () =>
          new Promise<ValidationResult>((done) => {
            resolve = done;
          }),
      },
    ],
  });
  const result = table.edit({ rowKey: 1, column: "value", value: 3 });
  let calls = 0;
  table.subscribe(() => {
    calls++;
  });
  table.destroy();
  resolve(true);
  expect((await result.completion)?.status).toBe("rejected");
  expect(calls).toBe(0);
});

it("keeps application-time refusals alongside superseded cells in the final completion", async () => {
  let resolve!: (result: ValidationResult) => void;
  const request = new Promise<ValidationResult>((done) => {
    resolve = done;
  });
  let blocked = false;
  const table = createTable({
    data: [
      { id: 1, value: 2 },
      { id: 2, value: 2 },
    ],
    columns: [
      {
        id: "computed",
        accessor: (row) => row.value,
        editable: true,
        setValue: (row, value: number) => {
          if (blocked && row.id === 2) throw new Error("Setter refused.");
          return { ...row, value };
        },
        validate: (value) => (value === 3 ? request : true),
      },
    ],
  });
  const result = table.edit([
    { rowKey: 1, column: "computed", value: 3 },
    { rowKey: 2, column: "computed", value: 3 },
  ]);
  table.edit({ rowKey: 1, column: "computed", value: 4 });
  blocked = true;
  resolve(true);
  const final = await result.completion;
  expect(final?.status).toBe("rejected");
  expect(final?.issues.map((problem) => problem.code)).toEqual(["invalid_value", "stale_draft"]);
  expect(table.getSnapshot().getRow(2)?.original.value).toBe(2);
});
