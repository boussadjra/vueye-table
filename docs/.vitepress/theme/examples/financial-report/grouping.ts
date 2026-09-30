/*
 * Grouping, composed on top of the engine: take the rows that survived search, filters, and
 * sorting, bucket them by one field, and sum each bucket. Nothing here knows about Vue.
 */
import type { SortRule, TableRow } from "vueye-table";

import { DEPARTMENTS, REGIONS, type CostLine } from "./data";

export type GroupBy = "region" | "department" | "none";

/** The summed columns. Variance % is derived from two sums, never summed itself. */
export const MEASURES = ["q1", "q2", "q3", "q4", "fy", "budget", "variance"] as const;
export type Measure = (typeof MEASURES)[number];

export type Totals = Readonly<Record<Measure, number>> & {
  readonly variancePct: number;
  readonly count: number;
};

export interface Group {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly TableRow<CostLine>[];
  readonly totals: Totals;
}

/** Sum every measure through the row's own accessors, so computed columns aggregate too. */
export function totalsOf(rows: readonly TableRow<CostLine>[]): Totals {
  const sums = Object.fromEntries(MEASURES.map((id) => [id, 0])) as Record<Measure, number>;
  for (const row of rows) {
    for (const id of MEASURES) {
      sums[id] += Number(row.getValue(id) ?? 0);
    }
  }
  return {
    ...sums,
    variancePct: sums.budget === 0 ? 0 : sums.variance / sums.budget,
    count: rows.length,
  };
}

const ORDER: Readonly<Record<Exclude<GroupBy, "none">, readonly string[]>> = {
  region: REGIONS,
  department: DEPARTMENTS,
};

/**
 * Bucket rows in the order they arrive, so every group keeps the table's sort inside it. Groups
 * themselves follow the first sort rule: by name when it is the grouped column, by subtotal when
 * it is a summed one, and in their natural order otherwise.
 */
export function groupRows(
  rows: readonly TableRow<CostLine>[],
  by: Exclude<GroupBy, "none">,
  sorting: readonly SortRule[],
): readonly Group[] {
  const buckets = new Map<string, TableRow<CostLine>[]>();
  for (const row of rows) {
    const key = String(row.getValue(by));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }
  const groups = [...buckets].map(
    ([key, members]): Group => ({ key, label: key, rows: members, totals: totalsOf(members) }),
  );

  const natural = ORDER[by];
  const rule = sorting[0];
  const sign = rule?.direction === "desc" ? -1 : 1;
  const measure = MEASURES.find((id) => id === rule?.column);
  return groups.toSorted((left, right) => {
    if (measure) {
      return (left.totals[measure] - right.totals[measure]) * sign;
    }
    if (rule?.column === "variancePct") {
      return (left.totals.variancePct - right.totals.variancePct) * sign;
    }
    const order = natural.indexOf(left.key) - natural.indexOf(right.key);
    return rule?.column === by ? order * sign : order;
  });
}
