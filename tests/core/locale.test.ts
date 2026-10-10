import {
  compareValues,
  createTable,
  defaultTableMessages,
  filterRows,
  foldText,
  formatCount,
  gridCommand,
  resolveTableMessages,
} from "@vueye-table/core";
import { describe, expect, it } from "vitest";

describe("foldText", () => {
  it("ignores case, accents and Arabic letter shapes", () => {
    expect(foldText("Bénali")).toBe("benali");
    expect(foldText("أحمد")).toBe(foldText("احمد"));
    expect(foldText("إيمان")).toBe(foldText("ايمان"));
    expect(foldText("فاطمة")).toBe(foldText("فاطمه"));
    expect(foldText("مُحَمَّد")).toBe(foldText("محمد"));
    expect(foldText("مصطفى")).toBe(foldText("مصطفي"));
    expect(foldText("مـحـمـد")).toBe(foldText("محمد"));
    expect(foldText("ٱلله")).toBe(foldText("الله"));
  });
});

describe("search folding", () => {
  type Person = { readonly id: number; readonly name: string };
  const data: readonly Person[] = [
    { id: 1, name: "أحمد بنعلي" },
    { id: 2, name: "Bénali Sara" },
    { id: 3, name: "Karim" },
  ];
  const columns = [{ id: "name" as const }];

  it("finds a name typed without its accents or hamza", () => {
    const table = createTable({ data, columns });
    table.search("احمد");
    expect(table.getSnapshot().rows.map((row) => row.original.id)).toEqual([1]);
    table.search("benali");
    expect(table.getSnapshot().rows.map((row) => row.original.id)).toEqual([2]);
  });

  it("takes the host's own folding", () => {
    const table = createTable({ data, columns, normalizeText: (text) => text.toLowerCase() });
    table.search("benali");
    expect(table.getSnapshot().rows).toHaveLength(0);
  });

  it("folds a text column filter the same way", () => {
    const table = createTable({ data, columns });
    table.filter("name", "BENALI");
    expect(table.getSnapshot().rows.map((row) => row.original.id)).toEqual([2]);
  });

  it("is exported as a pure stage taking the folding", () => {
    const table = createTable({ data, columns });
    const snapshot = table.getSnapshot();
    const rows = filterRows(snapshot.processedRows, snapshot.columns, "KARIM", {}, (text) =>
      text.toLowerCase(),
    );
    expect(rows.map((row) => row.original.id)).toEqual([3]);
  });
});

describe("locale-aware sorting", () => {
  it("orders text with the table's locale", () => {
    const data = [
      { id: 1, name: "z" },
      { id: 2, name: "ä" },
      { id: 3, name: "b" },
    ];
    const swedish = createTable({ data, columns: [{ id: "name" as const }], locale: "sv" });
    swedish.toggleSort("name");
    expect(swedish.getSnapshot().rows.map((row) => row.original.name)).toEqual(["b", "z", "ä"]);
    const german = createTable({ data, columns: [{ id: "name" as const }], locale: "de" });
    german.toggleSort("name");
    expect(german.getSnapshot().rows.map((row) => row.original.name)).toEqual(["ä", "b", "z"]);
  });

  it("keeps NaN with the empty values, last in both directions", () => {
    expect(compareValues(Number.NaN, 1)).toBe(1);
    expect(compareValues(1, Number.NaN)).toBe(-1);
    expect(compareValues(Number.NaN, Number.NaN)).toBe(0);
    const data = [
      { id: 1, n: Number.NaN },
      { id: 2, n: 3 },
      { id: 3, n: 1 },
    ];
    const table = createTable({ data, columns: [{ id: "n" as const }] });
    table.toggleSort("n");
    expect(table.getSnapshot().rows.map((row) => row.original.id)).toEqual([3, 2, 1]);
    table.toggleSort("n");
    expect(table.getSnapshot().rows.map((row) => row.original.id)).toEqual([2, 3, 1]);
  });
});

describe("messages", () => {
  it("formats counts in the locale", () => {
    expect(formatCount(10000, "en")).toEqual({ value: 10000, text: "10,000" });
    expect(formatCount(10000, "fr").text).toBe("10 000");
  });

  it("says the range in English by default", () => {
    const messages = resolveTableMessages();
    const count = (value: number) => formatCount(value, "en");
    expect(
      messages.rangeStatus({
        start: count(26),
        end: count(50),
        total: count(10000),
        selected: count(0),
      }),
    ).toBe("26–50 of 10,000 rows");
    expect(
      messages.rangeStatus({ start: count(1), end: count(1), total: count(1), selected: count(2) }),
    ).toBe("1–1 of 1 row, 2 selected");
    expect(messages.selectRow({ position: count(3) })).toBe("Select row 3");
  });

  it("keeps the host's words over the defaults", () => {
    const messages = resolveTableMessages({ noMatchingRows: "Aucune ligne" });
    expect(messages.noMatchingRows).toBe("Aucune ligne");
    expect(messages.nextPage).toBe(defaultTableMessages.nextPage);
  });
});

describe("right-to-left keys", () => {
  it("mirrors the arrows", () => {
    expect(gridCommand({ key: "ArrowLeft", direction: "rtl" })).toMatchObject({
      type: "move",
      direction: "right",
    });
    expect(gridCommand({ key: "ArrowRight", direction: "rtl" })).toMatchObject({
      direction: "left",
    });
    expect(gridCommand({ key: "Tab", direction: "rtl" })).toMatchObject({ direction: "right" });
  });

  it("expands a tree row with the arrow pointing into the row", () => {
    const tree = { canExpand: true, expanded: false };
    expect(gridCommand({ key: "ArrowLeft", direction: "rtl" }, tree)).toEqual({
      type: "tree",
      action: "expand",
    });
    expect(
      gridCommand({ key: "ArrowRight", direction: "rtl" }, { ...tree, expanded: true }),
    ).toEqual({ type: "tree", action: "collapse" });
  });
});
