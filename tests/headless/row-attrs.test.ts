import { createTable } from "@vueye-table/core";
import { rowAttributes } from "@vueye-table/headless";
import { describe, expect, it } from "vitest";

const table = createTable({ data: [{ id: 1, name: "Amina" }], columns: [{ id: "name" }] });
const row = table.getSnapshot().rows[0]!;

describe("rowAttributes", () => {
  it("keeps a class, a style, and data and aria attributes", () => {
    expect(
      rowAttributes(
        (item: { name: string }) => ({
          class: "is-absent",
          style: { color: "red" },
          "data-name": item.name,
          "aria-description": "absent",
        }),
        row,
      ),
    ).toEqual({
      class: "is-absent",
      style: { color: "red" },
      "data-name": "Amina",
      "aria-description": "absent",
    });
  });

  it("leaves out handlers and every other attribute", () => {
    const given = {
      onClick: () => undefined,
      key: "x",
      ref: "row",
      role: "button",
      tabindex: 0,
      id: "row-1",
      "data-ok": "yes",
    };
    expect(rowAttributes(() => given as never, row)).toEqual({ "data-ok": "yes" });
  });

  it("gives nothing without a function or an answer", () => {
    expect(rowAttributes(undefined, row)).toEqual({});
    expect(rowAttributes(() => undefined, row)).toEqual({});
    expect(rowAttributes(() => null, row)).toEqual({});
  });
});
