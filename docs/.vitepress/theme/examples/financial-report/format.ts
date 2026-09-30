/* Number formatting shared by the columns, the group subtotals, the grand total, and the chart. */

export type Unit = "usd" | "k" | "m";

export const UNITS: readonly {
  readonly id: Unit;
  readonly label: string;
  readonly name: string;
}[] = [
  { id: "usd", label: "$", name: "Dollars" },
  { id: "k", label: "$K", name: "Thousands of dollars" },
  { id: "m", label: "$M", name: "Millions of dollars" },
];

/** An absolute amount in a unit: `$1,234`, `$1.2K`, `$0.01M`. Signs are the caller's choice. */
export function money(value: number, unit: Unit): string {
  const divisor = unit === "usd" ? 1 : unit === "k" ? 1_000 : 1_000_000;
  const digits = unit === "m" ? 2 : 0;
  const text = (Math.abs(value) / divisor).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `$${text}${unit === "k" ? "K" : unit === "m" ? "M" : ""}`;
}

export function signed(value: number, unit: Unit): string {
  return `${value < 0 ? "−" : "+"}${money(value, unit)}`;
}

export function percent(value: number): string {
  return `${value < 0 ? "−" : "+"}${Math.abs(value * 100).toFixed(1)}%`;
}

/** Half a variance bar's width stands for this much variance; larger values fill it. */
const BAR_SCALE = 0.25;

export function barFill(ratio: number): Record<string, string> {
  return { "--fill": `${(Math.min(Math.abs(ratio) / BAR_SCALE, 1) * 50).toFixed(2)}%` };
}

export const DEPARTMENT_HUE: Readonly<Record<string, string>> = {
  Engineering: "violet",
  Sales: "blue",
  Marketing: "magenta",
  "Customer Success": "teal",
  "G&A": "orange",
};

export const REGION_CODE: Readonly<Record<string, string>> = {
  "North America": "NA",
  EMEA: "EU",
  APAC: "AP",
};
