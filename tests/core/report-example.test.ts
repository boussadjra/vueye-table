import { createTable } from "@vueye-table/core";
import { describe, expect, it } from "vitest";

import type { CostLine } from "../../docs/.vitepress/theme/examples/financial-report/data";
import {
  ALL_LINES_KEY,
  reportColumns,
  withReferenceTotal,
} from "../../docs/.vitepress/theme/examples/financial-report/report";
import { totalsOf } from "../../docs/.vitepress/theme/examples/financial-report/totals";

const lines: readonly CostLine[] = Object.freeze(
  [
    {
      id: "small",
      item: "Small",
      region: "EMEA",
      department: "Engineering",
      q1: 50,
      q2: 0,
      q3: 0,
      q4: 0,
      budget: 100,
    },
    {
      id: "large",
      item: "Large",
      region: "EMEA",
      department: "Engineering",
      q1: 1800,
      q2: 0,
      q3: 0,
      q4: 0,
      budget: 900,
    },
    {
      id: "other",
      item: "Other",
      region: "APAC",
      department: "Sales",
      q1: 150,
      q2: 0,
      q3: 0,
      q4: 0,
      budget: 200,
    },
  ].map((line) => Object.freeze(line as CostLine)),
);

function report() {
  return createTable<CostLine>({
    data: withReferenceTotal(lines),
    columns: reportColumns("usd"),
    paginate: false,
    initialState: { grouping: ["region"], rowPinning: { top: [], bottom: [ALL_LINES_KEY] } },
  });
}

describe("financial report example", () => {
  it("uses ratio-of-totals aggregates and keeps its source reference out of every group", () => {
    const table = report();
    const snapshot = table.getSnapshot();
    const group = snapshot.renderItems.find(
      (item) => item.kind === "group" && item.value === "EMEA",
    );
    expect(group?.kind).toBe("group");
    if (group?.kind !== "group") throw new Error("Missing EMEA group");
    expect(group.leafCount).toBe(2);
    expect(group.getAggregate("q1")).toBe(1850);
    expect(group.getAggregate("variancePct")).toBe(-0.85);
    expect(group.getAggregateDisplay("variancePct")).toBe("−85.0%");
    expect(snapshot.bottomRows.map((row) => row.key)).toEqual([ALL_LINES_KEY]);
    expect(snapshot.bottomRows[0]?.getValue("fy")).toBe(2000);
    expect(snapshot.bottomRows[0]?.getValue("budget")).toBe(1200);
    expect(totalsOf(snapshot.processedRows).count).toBe(3);
    expect(snapshot.processedRows.some((row) => row.key === ALL_LINES_KEY)).toBe(false);
    expect(lines).toHaveLength(3);
    table.destroy();
  });

  it("filters and collapses groups without changing the all-source reference total", () => {
    const table = report();
    table.filter("region", ["EMEA"]);
    table.collapseAllGroups();
    const snapshot = table.getSnapshot();
    expect(snapshot.rows).toHaveLength(0);
    expect(snapshot.renderItems).toHaveLength(1);
    expect(totalsOf(snapshot.processedRows)).toMatchObject({ count: 2, fy: 1850, budget: 1000 });
    expect(snapshot.bottomRows[0]?.getValue("fy")).toBe(2000);
    table.search("no such cost line");
    expect(table.getSnapshot().processedRows).toHaveLength(0);
    expect(table.getSnapshot().bottomRows[0]?.key).toBe(ALL_LINES_KEY);
    table.destroy();
  });
});
