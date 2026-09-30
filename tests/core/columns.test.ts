import {
  compareValues,
  defineColumns,
  formatValue,
  humanize,
  inferColumns,
  matchesFilter,
  parseAs,
  resolveColumn,
  typeOf,
} from "@vueye-table/core";
import { describe, expect, it } from "vitest";

import { people, type Person } from "../fixtures";

describe("humanize", () => {
  it("turns ids into sentence-case headers", () => {
    expect(humanize("createdAt")).toBe("Created at");
    expect(humanize("name.first_name")).toBe("Name first name");
    expect(humanize("")).toBe("");
  });
});

describe("resolveColumn", () => {
  it("reads nested paths and applies defaults", () => {
    const column = resolveColumn<Person>({ id: "name.first" });
    expect(column.header).toBe("Name first");
    expect(column.align).toBe("start");
    expect(column.sortable).toBe(true);
    expect(column.searchable).toBe(true);
    expect(column.getValue(people[0] as Person)).toBe("Ada");
    expect(column.isEditable(people[0] as Person)).toBe(false);
  });

  it("types format by the path's value", () => {
    const columns = defineColumns<Person>([
      { id: "age", format: (age) => (age === null ? "unknown" : `${age.toFixed(0)} years`) },
      { id: "full", accessor: (row) => `${row.name.first} ${row.name.last}` },
    ]);
    const [age, full] = columns.map((column) => resolveColumn(column));
    expect(age?.format(36, people[0] as Person)).toBe("36 years");
    expect(age?.format(null, people[0] as Person)).toBe("unknown");
    expect(full?.getValue(people[1] as Person)).toBe("Alan Turing");
  });

  it("writes path columns without mutating and refuses computed columns without setValue", () => {
    const row = people[0] as Person;
    const path = resolveColumn<Person>({ id: "name.first", editable: true });
    const computed = resolveColumn<Person>({
      id: "full",
      accessor: (r) => r.name.first,
      editable: true,
    });
    const updated = path.setValue(row, "Augusta");
    expect(updated?.name.first).toBe("Augusta");
    expect(updated?.name.last).toBe("Lovelace");
    expect(row.name.first).toBe("Ada");
    expect(computed.isEditable(row)).toBe(false);
    expect(computed.setValue(row, "x")).toBeUndefined();
  });

  it("parses input by the current value's type", () => {
    const row = people[0] as Person;
    const age = resolveColumn<Person>({ id: "age" });
    const active = resolveColumn<Person>({ id: "active" });
    const joined = resolveColumn<Person>({ id: "joined" });
    expect(age.parse(" 40 ", row)).toEqual({ ok: true, value: 40 });
    expect(age.parse("", row)).toEqual({ ok: true, value: null });
    expect(age.parse("forty", row)).toEqual({ ok: false, message: '"forty" is not a number' });
    expect(active.parse("No", row)).toEqual({ ok: true, value: false });
    expect(active.parse("maybe", row).ok).toBe(false);
    expect(joined.parse("2024-01-01T00:00:00Z", row)).toEqual({
      ok: true,
      value: new Date("2024-01-01T00:00:00Z"),
    });
    expect(joined.parse("never", row).ok).toBe(false);
    expect(joined.parse(" ", row)).toEqual({ ok: true, value: null });
  });

  it("reads an empty cell by a sample from another row, or by its declared type", () => {
    const empty = { ...(people[0] as Person), age: null };
    const age = resolveColumn<Person>({ id: "age" });
    expect(age.parse("7", empty)).toEqual({ ok: true, value: "7" });
    expect(age.parse("7", empty, 36)).toEqual({ ok: true, value: 7 });
    const typed = resolveColumn<Person>({ id: "age", type: "number" });
    expect(typed.parse("7", empty)).toEqual({ ok: true, value: 7 });
    expect(typeOf(undefined)).toBeUndefined();
    expect(typeOf("x")).toBe("text");
    expect(parseAs(" padded ", "text")).toEqual({ ok: true, value: " padded " });
  });

  it("reports a throwing custom parse as a failure", () => {
    const column = resolveColumn<Person>({
      id: "city",
      parse: (input) => {
        if (input.length < 2) {
          throw new Error("Too short");
        }
        return input;
      },
    });
    expect(column.parse("A", people[0] as Person)).toEqual({ ok: false, message: "Too short" });
    expect(column.parse("Paris", people[0] as Person)).toEqual({ ok: true, value: "Paris" });
  });
});

describe("compareValues", () => {
  it("orders numbers, dates, booleans, and text naturally, empty last", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("item 2", "item 10")).toBeLessThan(0);
    expect(compareValues(new Date(1), new Date(2))).toBeLessThan(0);
    expect(compareValues(false, true)).toBeLessThan(0);
    expect(compareValues(2n, 1n)).toBeGreaterThan(0);
    expect(compareValues(null, 1)).toBeGreaterThan(0);
    expect(compareValues("", "")).toBe(0);
  });
});

describe("formatValue", () => {
  it("never depends on the locale", () => {
    expect(formatValue(new Date("2020-01-10T00:00:00Z"))).toBe("2020-01-10T00:00:00.000Z");
    expect(formatValue(new Date("nope"))).toBe("");
    expect(formatValue([1, "a"])).toBe("1, a");
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
    expect(formatValue(undefined)).toBe("");
  });
});

describe("matchesFilter", () => {
  it("treats empty filters as pass-through", () => {
    expect(matchesFilter(1, undefined, "1")).toBe(true);
    expect(matchesFilter(1, [], "1")).toBe(true);
  });

  it("matches lists, ranges, text, and identity", () => {
    expect(matchesFilter("Boston", ["Boston", "London"], "Boston")).toBe(true);
    expect(matchesFilter("Paris", ["Boston"], "Paris")).toBe(false);
    expect(matchesFilter(40, { min: 30, max: 50 }, "40")).toBe(true);
    expect(matchesFilter(60, { max: 50 }, "60")).toBe(false);
    expect(matchesFilter(null, { min: 0 }, "")).toBe(false);
    expect(matchesFilter(new Date("2020-01-01"), { min: new Date("2019-01-01") }, "")).toBe(true);
    expect(matchesFilter("Boston", "bos", "Boston")).toBe(true);
    expect(matchesFilter(true, true, "true")).toBe(true);
    expect(matchesFilter(true, false, "true")).toBe(false);
  });

  it("reads text range bounds as numbers and dates", () => {
    // Bounds typed into a text box arrive as strings.
    expect(matchesFilter(40, { min: "30", max: "50" }, "40")).toBe(true);
    expect(matchesFilter(40, { min: "41" }, "40")).toBe(false);
    expect(matchesFilter(9, { min: "10" }, "9")).toBe(false);
    const joined = new Date("2020-01-10T00:00:00Z");
    expect(matchesFilter(joined, { min: "2020-01-01", max: "2020-12-31" }, "")).toBe(true);
    expect(matchesFilter(joined, { min: "2021-01-01" }, "")).toBe(false);
    expect(matchesFilter("2024-03-05", { min: new Date("2024-03-05T00:00:00Z") }, "")).toBe(true);
    expect(matchesFilter("2024-03-04", { min: new Date("2024-03-05T00:00:00Z") }, "")).toBe(false);
  });

  it("leaves a range open at an empty or unreadable bound", () => {
    expect(matchesFilter(40, { min: "", max: "50" }, "40")).toBe(true);
    expect(matchesFilter(40, { min: "abc" }, "40")).toBe(true);
    expect(matchesFilter(null, { min: "", max: "" }, "")).toBe(true);
    expect(matchesFilter(null, { min: undefined }, "")).toBe(true);
  });
});

describe("inferColumns", () => {
  it("flattens nested objects into paths", () => {
    expect(inferColumns(people).map((column) => column.id)).toEqual([
      "id",
      "name.first",
      "name.last",
      "age",
      "city",
      "active",
      "joined",
    ]);
  });
});
