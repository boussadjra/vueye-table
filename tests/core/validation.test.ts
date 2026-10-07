import {
  createTable,
  type ColumnDef,
  type TableIssue,
  type ValidationResult,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

interface Line {
  id: number;
  name: string;
  start: number;
  end: number;
}
const data: readonly Line[] = [
  { id: 1, name: "Ada", start: 1, end: 5 },
  { id: 2, name: "Alan", start: 2, end: 6 },
];
const columns: readonly ColumnDef<Line>[] = [
  { id: "name", editable: true },
  { id: "start", editable: true },
  { id: "end", editable: true },
];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function flush() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("business validation", () => {
  it("recovers when a custom immutable writer fails while building or committing a draft", () => {
    let writes = 0;
    const definitions: readonly ColumnDef<Line>[] = [
      {
        id: "name",
        accessor: (row) => row.name,
        editable: true,
        setValue: (row, value) => {
          writes++;
          if (writes === 2) throw new Error("Writer refused");
          return { ...row, name: String(value) };
        },
      },
      { id: "end", editable: true },
    ];
    const table = createTable({ data, columns: definitions });
    const result = table.edit([
      { rowKey: 1, column: "name", value: "New" },
      { rowKey: 2, column: "end", value: 7 },
    ]);
    expect(result.status).toBe("partial");
    expect(result.issues[0]?.code).toBe("invalid_value");
    expect(table.getSnapshot().getRow(1)?.original.name).toBe("Ada");
    expect(table.getSnapshot().getRow(2)?.original.end).toBe(7);
    writes = 0;
    const crossField = createTable({ data, columns: definitions, validateRow: () => true });
    expect(crossField.edit({ rowKey: 1, column: "name", value: "New" }).issues[0]?.code).toBe(
      "validation_failed",
    );
    expect(crossField.getSnapshot().getRow(1)?.original).toBe(data[0]);
  });
  it("exposes issue maps as immutable iterable revision data for renderers and server payloads", () => {
    const table = createTable({
      data,
      columns: [{ id: "name", editable: true, validate: () => "Choose a name." }],
    });
    table.edit({ rowKey: 1, column: "name", value: "New" });
    const problems = table.getSnapshot().getRow(1)!.cellIssues!;
    expect(problems.size).toBe(1);
    expect([...problems.keys()]).toEqual(["name"]);
    expect([...problems.values()].map((problem) => problem.message)).toEqual(["Choose a name."]);
    expect([...problems.entries()]).toEqual([...problems]);
    const names: string[] = [];
    problems.forEach((_problem, name, map) => {
      names.push(name);
      expect(map).toBe(problems);
    });
    expect(names).toEqual(["name"]);
    expect("set" in problems).toBe(false);
    expect(Object.isFrozen(problems)).toBe(true);
    table.setColumns([{ id: "name", editable: true }]);
    expect(table.getSnapshot().getRow(1)?.cellIssues).toBeUndefined();
    expect(problems.has("name")).toBe(true);
  });
  it("validates parsed and typed changed cells, keeps partial results, and records immutable issues", () => {
    const validate = vi.fn<(value: number) => ValidationResult>((value: number) =>
      value > 0 ? true : { message: "Use a positive start.", code: "positive" },
    );
    const onEditIssues = vi.fn<() => void>();
    const table = createTable<Line>({
      data,
      columns: [{ id: "start", editable: true, validate }],
      onEditIssues,
    });
    const result = table.edit([
      { rowKey: 1, column: "start", input: "-1" },
      { rowKey: 2, column: "start", value: 3 },
    ]);
    expect(result.status).toBe("partial");
    expect(result.issues[0]).toMatchObject({
      code: "validation_failed",
      validationCode: "positive",
      rowKey: 1,
      column: "start",
    });
    expect(table.getSnapshot().getRow(1)?.cellIssues?.get("start")).toBe(result.issues[0]);
    expect(Object.isFrozen(result.issues[0])).toBe(true);
    const old = table.getSnapshot();
    table.edit({ rowKey: 1, column: "start", value: 2 });
    expect(old.getRow(1)?.cellIssues?.has("start")).toBe(true);
    expect(table.getSnapshot().getRow(1)?.cellIssues).toBeUndefined();
    expect(validate).toHaveBeenCalledTimes(3);
    table.edit({ rowKey: 1, column: "start", value: 2 });
    expect(validate).toHaveBeenCalledTimes(3);
    expect(onEditIssues).toHaveBeenCalledOnce();
    expect(data[0]?.start).toBe(1);
  });
  it.each([
    ["min", { kind: "number", min: 2 }, 1],
    ["max", { kind: "number", max: 3 }, 4],
    ["numeric", { kind: "number", min: 0 }, "hello"],
    ["length", { kind: "text", maxLength: 2 }, "long"],
    ["option", { kind: "select", options: ["Ada", "Alan"] }, "Other"],
    ["pattern", { kind: "text", pattern: "^[A-Z]+$" }, "lower"],
    ["bad pattern", { kind: "text", pattern: "[" }, "X"],
    ["bad length", { kind: "text", maxLength: -1 }, "X"],
    ["bad bound", { kind: "number", min: Number.NaN }, 3],
    ["bad order", { kind: "number", min: 5, max: 2 }, 3],
  ] as const)("enforces %s on direct edits and paste", (_name, editor, value) => {
    const table = createTable<Line>({ data, columns: [{ id: "name", editable: true, editor }] });
    expect(table.edit({ rowKey: 1, column: "name", value }).issues[0]?.code).toBe(
      "validation_failed",
    );
    expect(table.paste({ row: 0, column: 0 }, String(value)).status).toBe("rejected");
    expect(table.getSnapshot().getRow(1)?.original).toBe(data[0]);
  });
  it("accepts constraints at their boundaries, including numeric dates and null options", () => {
    const table = createTable<{ id: number; value: unknown }>({
      data: [{ id: 1, value: "old" }],
      columns: [
        {
          id: "value",
          accessor: (row) => row.value,
          setValue: (row, value) => ({ ...row, value }),
          editable: true,
          editor: { kind: "text", maxLength: 3, pattern: "^[A-Z]+$" },
        },
      ],
    });
    expect(table.edit({ rowKey: 1, column: "value", value: "NEW" }).status).toBe("applied");
    table.setColumns([
      {
        id: "value",
        accessor: (row) => row.value,
        setValue: (row, value) => ({ ...row, value }),
        editable: true,
        editor: { kind: "date", min: 0, max: 20 },
      },
    ]);
    expect(table.edit({ rowKey: 1, column: "value", value: new Date(10) }).status).toBe("applied");
    table.setColumns([
      {
        id: "value",
        accessor: (row) => row.value,
        setValue: (row, value) => ({ ...row, value }),
        editable: true,
        editor: { kind: "select", options: [null] },
      },
    ]);
    expect(table.edit({ rowKey: 1, column: "value", value: null }).status).toBe("applied");
  });
  it("validates one complete draft per affected row, refuses a whole invalid row and keeps another row", () => {
    const validateRow = vi.fn<(next: Line) => ValidationResult>((next: Line) =>
      next.end >= next.start ? true : "End precedes start.",
    );
    const table = createTable({ data, columns, validateRow });
    expect(
      table.edit([
        { rowKey: 1, column: "start", value: 10 },
        { rowKey: 1, column: "end", value: 11 },
      ]).status,
    ).toBe("applied");
    expect(validateRow).toHaveBeenCalledOnce();
    expect(validateRow.mock.calls[0]?.[0]).toMatchObject({ start: 10, end: 11 });
    const result = table.edit([
      { rowKey: 1, column: "end", value: 9 },
      { rowKey: 2, column: "name", value: "Alonzo" },
    ]);
    expect(result.status).toBe("partial");
    expect(table.getSnapshot().getRow(1)?.original.end).toBe(11);
    expect(validateRow).toHaveBeenCalledTimes(3);
    table.undo();
    expect(table.getSnapshot().getRow(2)?.original.name).toBe("Alan");
    table.undo();
    expect(table.getSnapshot().getRow(1)?.original.start).toBe(1);
  });
  it.each(["cell", "row", "parse", "setter"])(
    "catches throwing %s callbacks without half-applying a row",
    (kind) => {
      const fail = () => {
        throw new Error("Refused safely");
      };
      const table = createTable<Line>({
        data,
        columns: [
          {
            id: "name",
            editable: true,
            ...(kind === "cell" ? { validate: fail } : {}),
            ...(kind === "parse" ? { parse: fail } : {}),
            ...(kind === "setter" ? { accessor: (row: Line) => row.name, setValue: fail } : {}),
          },
        ],
        ...(kind === "row" ? { validateRow: fail } : {}),
      });
      const result = table.edit({ rowKey: 1, column: "name", input: "New" });
      expect(result.status).toBe("rejected");
      expect(result.issues[0]?.message).toContain("Refused safely");
      expect(table.getSnapshot().getRow(1)?.original).toBe(data[0]);
    },
  );
  it("reports invalid validator results and protects keys, prototypes and unknown addresses", () => {
    const table = createTable({
      data,
      columns: [
        { id: "name", editable: true, validate: () => false as unknown as ValidationResult },
        { id: "id", editable: true },
      ],
    });
    expect(table.edit({ rowKey: 1, column: "name", value: "X" }).issues[0]?.message).toContain(
      "invalid result",
    );
    expect(table.edit({ rowKey: 1, column: "id", value: 9 }).issues[0]?.code).toBe(
      "invalid_row_operation",
    );
    expect(table.edit({ rowKey: 1, column: "__proto__.x", value: 9 }).issues[0]?.code).toBe(
      "unsafe_path",
    );
    expect(table.edit({ rowKey: 99, column: "name", value: "X" }).issues[0]?.code).toBe(
      "unknown_row",
    );
    expect(table.edit({ rowKey: 1, column: "missing", value: "X" }).issues[0]?.code).toBe(
      "unknown_column",
    );
  });
});

describe("async validation", () => {
  it("holds an entire paste and settles once, with one undo batch and one issue callback", async () => {
    const first = deferred<ValidationResult>();
    const second = deferred<ValidationResult>();
    const onDataChange = vi.fn<() => void>();
    const onEditIssues = vi.fn<() => void>();
    const table = createTable({
      data,
      columns: [
        {
          id: "start",
          editable: true,
          validate: (_value, row) => (row.id === 1 ? first.promise : second.promise),
        },
      ],
      onDataChange,
      onEditIssues,
    });
    const snapshots = vi.fn<() => void>();
    table.subscribe(snapshots);
    expect(table.paste({ row: 0, column: 0 }, "3\n4").status).toBe("pending");
    expect(table.getSnapshot().pendingCells).toHaveLength(2);
    expect(table.getSnapshot().getRow(1)?.original.start).toBe(1);
    first.resolve(true);
    await flush();
    expect(snapshots).toHaveBeenCalledOnce();
    second.resolve(true);
    await flush();
    expect(snapshots).toHaveBeenCalledTimes(2);
    expect(onDataChange).toHaveBeenCalledOnce();
    expect(onEditIssues).toHaveBeenCalledWith([]);
    expect(table.getSnapshot().pendingCells).toEqual([]);
    expect(table.getSnapshot().getRow(2)?.original.start).toBe(4);
    table.undo();
    expect(table.getSnapshot().getRow(1)?.original.start).toBe(1);
    expect(table.getSnapshot().getRow(2)?.original.start).toBe(2);
  });
  it("ignores superseded success/failure, applies independent live cells, and clears pending metadata", async () => {
    const old = deferred<ValidationResult>();
    const other = deferred<ValidationResult>();
    const table = createTable({
      data,
      columns: [
        {
          id: "start",
          editable: true,
          validate: (value, row) =>
            value === 3 ? (row.id === 1 ? old.promise : other.promise) : true,
        },
      ],
    });
    table.edit([
      { rowKey: 1, column: "start", value: 3 },
      { rowKey: 2, column: "start", value: 3 },
    ]);
    table.edit({ rowKey: 1, column: "start", value: 4 });
    old.resolve("Stale failure");
    other.resolve(true);
    await flush();
    expect(table.getSnapshot().getRow(1)?.original.start).toBe(4);
    expect(table.getSnapshot().getRow(2)?.original.start).toBe(3);
    expect(table.getSnapshot().issues).toEqual([]);
    expect(table.getSnapshot().pendingCells).toEqual([]);
  });
  it.each(["setData", "setColumns", "destroy", "remove", "undo"])(
    "fences pending completions after %s",
    async (action) => {
      const request = deferred<ValidationResult>();
      const onEditIssues = vi.fn<() => void>();
      const table = createTable({
        data,
        columns: [
          {
            id: "name",
            editable: true,
            validate: (value) => (value === "Pending" ? request.promise : true),
          },
        ],
        onEditIssues,
      });
      table.edit({ rowKey: 2, column: "name", value: "Saved" });
      table.edit({ rowKey: 1, column: "name", value: "Pending" });
      if (action === "setData") table.setData([...data]);
      if (action === "setColumns") table.setColumns(columns);
      if (action === "destroy") table.destroy();
      if (action === "remove") table.removeRows([1]);
      if (action === "undo") table.undo();
      request.resolve("Late error");
      await flush();
      expect(table.getSnapshot().getRow(1)?.original.name).not.toBe("Pending");
      expect(onEditIssues).not.toHaveBeenCalled();
    },
  );
  it("runs async row validation after accepted cell validation and refuses the row once", async () => {
    const cell = deferred<ValidationResult>();
    const row = deferred<ValidationResult>();
    const validateRow = vi.fn<() => Promise<ValidationResult>>(() => row.promise);
    const onEditIssues = vi.fn<(issues: readonly TableIssue[]) => void>();
    const table = createTable({
      data,
      columns: [
        { id: "start", editable: true, validate: () => cell.promise },
        { id: "end", editable: true },
      ],
      validateRow,
      onEditIssues,
    });
    expect(
      table.edit([
        { rowKey: 1, column: "start", value: 9 },
        { rowKey: 1, column: "end", value: 10 },
      ]).status,
    ).toBe("pending");
    expect(validateRow).not.toHaveBeenCalled();
    cell.resolve(true);
    await flush();
    expect(validateRow).toHaveBeenCalledOnce();
    row.resolve("Cross-field failure");
    await flush();
    expect(table.getSnapshot().getRow(1)?.original).toBe(data[0]);
    expect(onEditIssues).toHaveBeenCalledOnce();
    expect(onEditIssues.mock.calls[0]?.[0]).toHaveLength(2);
  });
  it("catches rejected promises, allows a newer unchanged edit to cancel a held value, and retains round trips", async () => {
    const request = deferred<ValidationResult>();
    const changed = vi.fn<(next: readonly Line[]) => void>();
    const table = createTable({
      data,
      columns: [{ id: "name", editable: true, validate: () => request.promise }],
      onDataChange: changed,
    });
    table.edit({ rowKey: 1, column: "name", value: "Pending" });
    table.setData(data);
    request.reject(new Error("Network failed"));
    await flush();
    expect(table.getSnapshot().issues[0]?.message).toBe("Network failed");
    const next = deferred<ValidationResult>();
    table.setColumns([{ id: "name", editable: true, validate: () => next.promise }]);
    table.edit({ rowKey: 1, column: "name", value: "Later" });
    table.edit({ rowKey: 1, column: "name", value: "Ada" });
    next.resolve(true);
    await flush();
    expect(table.getSnapshot().getRow(1)?.original.name).toBe("Ada");
    expect(table.getSnapshot().pendingCells).toEqual([]);
  });
  it.each([true, "Rejected"] as const)(
    "settles optimistic validation %s in one follow-up snapshot",
    async (answer) => {
      const request = deferred<ValidationResult>();
      const onEditIssues = vi.fn<() => void>();
      const table = createTable({
        data,
        columns: [{ id: "name", editable: true, validate: () => request.promise }],
        asyncValidation: "optimistic",
        onEditIssues,
      });
      const snapshots = vi.fn<() => void>();
      table.subscribe(snapshots);
      table.edit({ rowKey: 1, column: "name", value: "New" });
      expect(table.getSnapshot().getRow(1)?.original.name).toBe("New");
      request.resolve(answer);
      await flush();
      expect(snapshots).toHaveBeenCalledTimes(2);
      expect(table.getSnapshot().getRow(1)?.original.name).toBe(answer === true ? "New" : "Ada");
      expect(table.getSnapshot().canUndo).toBe(answer === true);
      expect(table.undo()).toBe(answer === true);
      expect(table.getSnapshot().getRow(1)?.original.name).toBe("Ada");
    },
  );
});

describe("pending changes", () => {
  it("tracks only changed rows and earliest cell values across paging/filtering, saving and undo", () => {
    const table = createTable({ data, columns });
    table.edit({ rowKey: 1, column: "start", value: 2 });
    table.edit({ rowKey: 1, column: "start", value: 3 });
    table.edit({ rowKey: 2, column: "name", value: "New" });
    table.search("none");
    table.sort("name", "desc");
    table.goToPage(2);
    expect(table.getPendingChanges().updated).toHaveLength(2);
    expect(table.getPendingChanges().updated[0]?.changes[0]?.previous).toBe(1);
    expect(table.getSnapshot().getRow(1)?.isDirty).toBe(true);
    const old = table.getSnapshot();
    table.markSaved([1]);
    expect(table.getSnapshot().getRow(1)?.isDirty).toBe(false);
    expect(old.getRow(1)?.isDirty).toBe(true);
    table.undo();
    expect(table.getPendingChanges().updated).toEqual([]);
    table.undo();
    expect(table.getPendingChanges().updated[0]?.changes[0]).toMatchObject({
      previous: 3,
      value: 2,
    });
    table.markSaved();
    expect(table.getPendingChanges().updated).toEqual([]);
  });
  it("reverts selected keys as one undoable batch, retains other drafts and the v-model round trip", () => {
    let own: readonly Line[] = data;
    const table = createTable({
      data,
      columns,
      onDataChange: (next) => {
        own = next;
      },
    });
    table.edit([
      { rowKey: 1, column: "name", value: "New" },
      { rowKey: 2, column: "start", value: 4 },
    ]);
    table.setData(own);
    expect(table.getPendingChanges().updated).toHaveLength(2);
    expect(table.revert([1]).status).toBe("applied");
    expect(table.getSnapshot().getRow(1)?.original.name).toBe("Ada");
    expect(table.getPendingChanges().updated.map((row) => row.rowKey)).toEqual([2]);
    table.undo();
    expect(table.getSnapshot().getRow(1)?.original.name).toBe("New");
    expect(table.getSnapshot().getRow(1)?.isDirty).toBe(true);
    table.redo();
    expect(table.getSnapshot().getRow(1)?.isDirty).toBe(false);
    table.revert();
    expect(table.getPendingChanges().updated).toEqual([]);
    expect(table.revert().status).toBe("unchanged");
    table.setData([...data]);
    expect(table.getSnapshot().canUndo).toBe(false);
  });
  it("retains undefined and null baseline values when a cell changes repeatedly", () => {
    const table = createTable<{ id: number; value: string | null | undefined }>({
      data: [
        { id: 1, value: undefined },
        { id: 2, value: null },
      ],
      columns: [{ id: "value", editable: true }],
    });
    for (const rowKey of [1, 2]) {
      table.edit({ rowKey, column: "value", value: "a" });
      table.edit({ rowKey, column: "value", value: "b" });
    }
    expect(table.getPendingChanges().updated.map((row) => row.changes[0]?.previous)).toEqual([
      undefined,
      null,
    ]);
    table.revert();
    expect(table.getPendingChanges().updated).toEqual([]);
  });
});
