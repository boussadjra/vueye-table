import {
  createTable,
  getPath,
  parseDelimited,
  resolveColumn,
  setPath,
  toDelimited,
  type PasteLimit,
  type TableIssue,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

describe("formula-like delimited content", () => {
  const values = [
    '=HYPERLINK("https://example.com","click")',
    "+1",
    "-1",
    "@SUM(A1)",
    "\t=1",
    "\r=1",
    "\n=1",
    "＝1",
    "＋1",
    "－1",
    "＠SUM(A1)",
    "ordinary",
    'text,"=1"',
    -12.5,
    42,
  ];
  const table = () =>
    createTable({
      data: values.map((value, id) => ({ id, value })),
      columns: [{ id: "value", header: "=Heading", editable: true }],
      initialState: { pagination: { page: 1, pageSize: 20 } },
    });
  const escaped = values.map((value, index) => [index < 11 ? "'" + value : String(value)]);

  it.each(["csv", "tsv"] as const)(
    "escapes %s cells and headers, while keeping numeric values",
    (format) => {
      const sheet = table();
      const delimiter = format === "csv" ? "," : "\t";
      expect(parseDelimited(sheet.exportRows({ format }), delimiter)).toEqual([
        ["'=Heading"],
        ...escaped,
      ]);
      expect(sheet.exportRows({ format, headers: false, escapeFormulas: false })).toBe(
        toDelimited(
          values.map((value) => [String(value)]),
          delimiter,
        ),
      );
      // Exporting never changes the row values or the text displayed in the grid.
      expect(sheet.getSnapshot().rows.map((row) => row.getValue("value"))).toEqual(values);
    },
  );

  it("preserves clipboard text by default and offers the same escaping option", () => {
    const sheet = table();
    const range = { top: 0, left: 0, bottom: values.length - 1, right: 0 };
    expect(sheet.copy(range)).toBe(toDelimited(values.map((value) => [String(value)])));
    expect(parseDelimited(sheet.copy(range, { escapeFormulas: true }))).toEqual(escaped);
  });

  it("does not exempt formula-like custom formatting just because the value is numeric", () => {
    const sheet = createTable({
      data: [{ id: 1, value: -12 }],
      columns: [{ id: "value", format: () => "=1+1" }],
    });
    expect(sheet.exportRows({ headers: false })).toBe("'=1+1");
    sheet.setColumns([{ id: "value", format: (value) => value.toFixed(2) }]);
    expect(sheet.exportRows({ headers: false })).toBe("-12.00");
    sheet.setData([{ id: 1, value: -Infinity }]);
    expect(sheet.exportRows({ headers: false })).toBe("'-Infinity");
  });
});

describe("prototype-sensitive paths", () => {
  const paths = [
    "__proto__.polluted",
    "constructor.prototype.polluted",
    "profile.__proto__.polluted",
    "profile.constructor.value",
    "prototype.value",
  ];

  it.each(paths)("refuses %s before reading or changing a row", (path) => {
    const read = vi.fn<() => { value: string }>(() => ({ value: "original" }));
    const source = {
      id: 1,
      get profile() {
        return read();
      },
    };
    const onIssue = vi.fn<(problem: TableIssue) => void>();
    const before = Object.getPrototypeOf(source);
    expect(getPath(source, path)).toBeUndefined();
    expect(setPath(source, path, { polluted: true }, onIssue)).toBe(source);
    expect(setPath(source, path, "ignored")).toBe(source);
    expect(read).not.toHaveBeenCalled();
    expect(onIssue).toHaveBeenCalledWith(
      expect.objectContaining({ code: "unsafe_path", column: path }),
    );
    expect(Object.getPrototypeOf(source)).toBe(before);
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
  });

  it("copies only own properties, including own prototype-named data without changing the prototype", () => {
    const inherited = { profile: { inherited: true } };
    const source: Record<string, unknown> = Object.create(inherited);
    source["id"] = 1;
    Object.defineProperty(source, "__proto__", { value: { data: true }, enumerable: true });
    expect(getPath(source, "profile")).toBe(inherited.profile);
    const next = setPath(source, "profile.name", "Ada");
    expect(next["profile"]).toEqual({ name: "Ada" });
    expect(next["id"]).toBe(1);
    expect(Object.getPrototypeOf(next)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(next, "__proto__")?.value).toEqual({ data: true });
    expect(source["profile"]).toBe(inherited.profile);
  });

  it("preserves safe inherited getters on row classes", () => {
    class Row {
      readonly id = 1;
      get name(): string {
        return "Ada";
      }
    }
    const source = new Row();
    const table = createTable({ data: [source], columns: [{ id: "name" }] });
    expect(getPath(source, "name")).toBe("Ada");
    expect(table.getSnapshot().rows[0]?.getValue("name")).toBe("Ada");
  });

  it.each(paths)("reports unsafe column %s on creation, setColumns, and edits", (path) => {
    const data = [{ id: 1, value: "original" }];
    const accessor = vi.fn<() => string>(() => "original");
    const setter = vi.fn<(row: (typeof data)[number]) => (typeof data)[number]>((row) => ({
      ...row,
      value: "changed",
    }));
    const definition = { id: path, accessor, setValue: setter, editable: true };
    const onEditIssues = vi.fn<(issues: readonly TableIssue[]) => void>();
    const onDataChange = vi.fn<(rows: readonly (typeof data)[number][]) => void>();
    const sheet = createTable({ data, columns: [definition], onEditIssues, onDataChange });
    expect(sheet.getSnapshot().columns).toEqual([]);
    expect(sheet.getSnapshot().issues).toEqual([
      expect.objectContaining({ code: "unsafe_path", column: path }),
    ]);
    const result = sheet.edit({ rowKey: 1, column: path, value: "changed" });
    expect(result.status).toBe("rejected");
    expect(result.issues).toEqual([
      expect.objectContaining({ code: "unsafe_path", column: path, rowKey: 1 }),
    ]);
    expect(onEditIssues).toHaveBeenCalledWith(result.issues);
    expect(onDataChange).not.toHaveBeenCalled();
    const column = resolveColumn(definition);
    expect(column.getValue(data[0]!)).toBeUndefined();
    expect(column.isEditable(data[0]!)).toBe(false);
    expect(column.setValue(data[0]!, "changed")).toBeUndefined();
    expect(accessor).not.toHaveBeenCalled();
    expect(setter).not.toHaveBeenCalled();
    expect(data[0]?.value).toBe("original");
    sheet.setColumns([{ id: "value" }]);
    expect(sheet.getSnapshot().issues).toEqual([]);
    sheet.setColumns([definition]);
    expect(sheet.getSnapshot().issues[0]?.code).toBe("unsafe_path");
  });

  it("refuses unsafe path columns even without a computed setter", () => {
    const sheet = createTable<Record<string, unknown>>({
      data: [{ id: 1 }],
      columns: [{ id: "__proto__.polluted", editable: true }],
    });
    expect(
      sheet.edit({ rowKey: 1, column: "__proto__.polluted", input: "yes" }).issues[0]?.code,
    ).toBe("unsafe_path");
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
  });
});

describe("bounded paste parsing", () => {
  function sheet(pasteLimit?: PasteLimit) {
    const data = Array.from({ length: 3 }, (_, id) => ({ id, a: "", b: "", c: "" }));
    const onDataChange = vi.fn<(rows: readonly (typeof data)[number][]) => void>();
    const onEditIssues = vi.fn<(issues: readonly TableIssue[]) => void>();
    const table = createTable({
      data,
      columns: [
        { id: "a", editable: true },
        { id: "b", editable: true },
        { id: "c", editable: true },
      ],
      pasteLimit,
      onDataChange,
      onEditIssues,
    });
    return { table, data, onDataChange, onEditIssues };
  }

  it("reads only the 3x3 destination from a 10 MB clipboard and keeps one undo batch", () => {
    const { table, data, onDataChange, onEditIssues } = sheet();
    const text = "1\t2\t3\n4\t5\t6\n7\t8\t9\n" + "x".repeat(10 * 1024 * 1024);
    const read = vi.spyOn(String.prototype, "charAt");
    const result = table.paste({ row: 0, column: 0 }, text);
    const reads = read.mock.calls.length;
    read.mockRestore();
    expect(reads).toBeLessThan(40);
    expect(result.status).toBe("partial");
    expect(result.changes.map((change) => change.value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
    expect(result.issues.map((problem) => problem.code)).toEqual(["paste_truncated"]);
    expect(onDataChange).toHaveBeenCalledOnce();
    expect(onEditIssues).toHaveBeenCalledOnce();
    expect(onEditIssues).toHaveBeenCalledWith(result.issues);
    expect(data.every((row) => row.a === "" && row.b === "" && row.c === "")).toBe(true);
    expect(table.undo()).toBe(true);
    expect(table.undo()).toBe(false);
    expect(table.getSnapshot().rows.map((row) => row.original)).toEqual(data);
  });

  it("skips clipped quoted columns without losing the next row's alignment", () => {
    const { table } = sheet();
    const result = table.paste({ row: 0, column: 1 }, 'a\tb\t"ignored\n""quote"""\nc\td\tend');
    expect(result.changes.map((change) => [change.column, change.value])).toEqual([
      ["b", "a"],
      ["c", "b"],
      ["b", "c"],
      ["c", "d"],
    ]);
    expect(result.issues[0]?.code).toBe("paste_truncated");
  });

  it.each(["1\t2\t3\n4\t5\t6\n7\t8\t9", "1\t2\t3\r\n4\t5\t6\r\n7\t8\t9\r\n"])(
    "does not report a full grid or a trailing newline as truncated",
    (text) => {
      const { table } = sheet();
      const result = table.paste({ row: 0, column: 0 }, text);
      expect(result.status).toBe("applied");
      expect(result.changes).toHaveLength(9);
      expect(result.issues).toEqual([]);
    },
  );

  it("bounds the number of parsed fields, including clipped columns", () => {
    const { table } = sheet({ maxCells: 2 });
    const result = table.paste({ row: 0, column: 0 }, "a\tb\tc\nd\te\tf");
    expect(result.changes.map((change) => change.value)).toEqual(["a", "b"]);
    expect(result.issues[0]?.code).toBe("paste_truncated");
    const { table: clipped } = sheet({ maxCells: 2 });
    expect(
      clipped.paste({ row: 0, column: 2 }, "a\tignored\nb").changes.map((change) => change.value),
    ).toEqual(["a"]);
    const { table: exact } = sheet({ maxCells: 2 });
    expect(exact.paste({ row: 0, column: 0 }, "a\nb\n").issues).toEqual([]);
  });

  it("does not apply a field cut short by the character limit", () => {
    const { table } = sheet({ maxLength: 4 });
    const result = table.paste({ row: 0, column: 0 }, 'a\t"long quoted field"');
    expect(result.changes.map((change) => change.value)).toEqual(["a"]);
    expect(result.issues[0]?.code).toBe("paste_truncated");
    const { table: exact } = sheet({ maxLength: 3 });
    expect(
      exact.paste({ row: 0, column: 0 }, "a\tb").changes.map((change) => change.value),
    ).toEqual(["a", "b"]);
    const { table: refused } = sheet({ maxLength: 2 });
    expect(refused.paste({ row: 0, column: 0 }, "long").status).toBe("rejected");
  });

  it("keeps quoted delimiters, doubled quotes, and explicit empty fields", () => {
    const { table } = sheet();
    const result = table.paste({ row: 0, column: 0 }, '"a\tb"\t"say ""hi"""\t\n""\tx\ty');
    expect(result.changes.map((change) => change.value)).toEqual(["a\tb", 'say "hi"', "x", "y"]);
    expect(result.issues).toEqual([]);
    expect(parseDelimited('""')).toEqual([[""]]);
  });

  it("reports discarded fields even when the extra field is empty", () => {
    const { table } = sheet();
    expect(table.paste({ row: 2, column: 2 }, "x\t").issues[0]?.code).toBe("paste_truncated");
    expect(table.paste({ row: 0, column: 2 }, "x\t").issues[0]?.code).toBe("paste_truncated");
  });

  it("handles empty input and pastes outside an empty or exhausted grid", () => {
    const { table } = sheet();
    expect(table.paste({ row: 0, column: 0 }, "").status).toBe("unchanged");
    expect(table.paste({ row: 3, column: 0 }, "x").issues[0]?.code).toBe("paste_truncated");
    expect(table.paste({ row: 0, column: 3 }, "x").issues[0]?.code).toBe("paste_truncated");
    table.setData([]);
    expect(table.paste({ row: 0, column: 0 }, "").issues).toEqual([]);
    expect(table.paste({ row: 0, column: 0 }, "x").status).toBe("rejected");
  });

  it.each([
    { row: -1, column: 0 },
    { row: 0, column: -1 },
    { row: 0.5, column: 0 },
    { row: 0, column: NaN },
  ])("reports an invalid origin %j", (origin) => {
    const { table } = sheet();
    expect(table.paste(origin, "x").issues[0]?.code).toBe("invalid_value");
  });

  it.each([0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    "reports invalid limits %s and recovers to defaults",
    (value) => {
      const { table } = sheet({ maxCells: value, maxLength: value });
      expect(table.getSnapshot().issues.map((problem) => problem.code)).toEqual([
        "invalid_paste_limit",
        "invalid_paste_limit",
      ]);
      expect(table.paste({ row: 0, column: 0 }, "a\tb\tc").changes).toHaveLength(3);
    },
  );
});
