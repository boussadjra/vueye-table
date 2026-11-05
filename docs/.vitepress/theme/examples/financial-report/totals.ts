import type { TableRow } from "@vueye-table/core";

import type { CostLine } from "./data";

export const MEASURES = ["q1", "q2", "q3", "q4", "fy", "budget", "variance"] as const;
export type Measure = (typeof MEASURES)[number];
export type Totals = Readonly<Record<Measure, number>> & {
  readonly variancePct: number;
  readonly count: number;
};

/** Report summary for filtered leaves; group aggregates are calculated by the engine. */
export function totalsOf(rows: readonly TableRow<CostLine>[]): Totals {
  const sums = Object.fromEntries(MEASURES.map((id) => [id, 0])) as Record<Measure, number>;
  for (const row of rows) for (const id of MEASURES) sums[id] += Number(row.getValue(id) ?? 0);
  return {
    ...sums,
    variancePct: sums.budget === 0 ? 0 : sums.variance / sums.budget,
    count: rows.length,
  };
}
