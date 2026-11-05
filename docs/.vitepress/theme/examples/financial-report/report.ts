import { defineColumns } from "@vueye-table/core";

import { DEPARTMENTS, REGIONS, type CostLine } from "./data";
import { money, percent, signed, type Unit } from "./format";

export const ALL_LINES_KEY = "all-lines-total";
export const fullYear = (line: CostLine): number => line.q1 + line.q2 + line.q3 + line.q4;

/** A fixed reference total: it stays outside filtered groups and is never aggregated again. */
export function withReferenceTotal(lines: readonly CostLine[]): readonly CostLine[] {
  const sums = lines.reduce(
    (total, line) => ({
      q1: total.q1 + line.q1,
      q2: total.q2 + line.q2,
      q3: total.q3 + line.q3,
      q4: total.q4 + line.q4,
      budget: total.budget + line.budget,
    }),
    { q1: 0, q2: 0, q3: 0, q4: 0, budget: 0 },
  );
  return [
    ...lines,
    Object.freeze({
      ...sums,
      id: ALL_LINES_KEY,
      item: "All-line total",
      region: REGIONS[0],
      department: DEPARTMENTS[0],
    }),
  ];
}

export function reportColumns(unit: Unit) {
  const format = (value: number): string => money(value, unit);
  const aggregateFormat = (value: unknown): string => format(Number(value));
  return defineColumns<CostLine>([
    { id: "item", header: "Line item", width: 220 },
    { id: "department", width: 150 },
    { id: "region", width: 150 },
    {
      id: "q1",
      header: "Q1",
      align: "end",
      searchable: false,
      format,
      aggregate: "sum",
      formatAggregate: aggregateFormat,
    },
    {
      id: "q2",
      header: "Q2",
      align: "end",
      searchable: false,
      format,
      aggregate: "sum",
      formatAggregate: aggregateFormat,
    },
    {
      id: "q3",
      header: "Q3",
      align: "end",
      searchable: false,
      format,
      aggregate: "sum",
      formatAggregate: aggregateFormat,
    },
    {
      id: "q4",
      header: "Q4",
      align: "end",
      searchable: false,
      format,
      aggregate: "sum",
      formatAggregate: aggregateFormat,
    },
    {
      id: "fy",
      header: "FY total",
      accessor: fullYear,
      align: "end",
      searchable: false,
      format,
      aggregate: "sum",
      formatAggregate: aggregateFormat,
    },
    {
      id: "budget",
      align: "end",
      searchable: false,
      format,
      aggregate: "sum",
      formatAggregate: aggregateFormat,
    },
    {
      id: "variance",
      accessor: (line) => line.budget - fullYear(line),
      align: "end",
      searchable: false,
      format: (value) => signed(value, unit),
      aggregate: "sum",
      formatAggregate: (value) => signed(Number(value), unit),
      filter: (value, wanted) =>
        wanted === "over" ? value < 0 : wanted === "under" ? value >= 0 : true,
    },
    {
      id: "variancePct",
      header: "Var %",
      align: "end",
      searchable: false,
      accessor: (line) => (line.budget === 0 ? 0 : (line.budget - fullYear(line)) / line.budget),
      format: percent,
      aggregate: (_values, lines) => {
        const budget = lines.reduce((sum, line) => sum + line.budget, 0);
        const actual = lines.reduce((sum, line) => sum + fullYear(line), 0);
        return budget === 0 ? 0 : (budget - actual) / budget;
      },
      formatAggregate: (value) => percent(Number(value)),
    },
  ]);
}
