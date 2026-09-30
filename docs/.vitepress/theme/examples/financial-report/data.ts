/*
 * FY2026 operating expenses for a fictional company: three regions, five departments, four cost
 * lines each. A seeded generator keeps every number identical on the server and in the browser.
 */

export const REGIONS = ["North America", "EMEA", "APAC"] as const;
export const DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Customer Success",
  "G&A",
] as const;

export type Region = (typeof REGIONS)[number];
export type Department = (typeof DEPARTMENTS)[number];

export interface CostLine {
  readonly id: string;
  readonly item: string;
  readonly department: Department;
  readonly region: Region;
  readonly q1: number;
  readonly q2: number;
  readonly q3: number;
  readonly q4: number;
  readonly budget: number;
}

/** Cost lines per department, with a yearly base amount in dollars for North America. */
const LINES: Readonly<Record<Department, readonly (readonly [string, number])[]>> = {
  Engineering: [
    ["Salaries & benefits", 4_800_000],
    ["Cloud infrastructure", 1_350_000],
    ["Software licenses", 420_000],
    ["Contractors", 610_000],
  ],
  Sales: [
    ["Salaries & commissions", 3_100_000],
    ["Travel & entertainment", 380_000],
    ["CRM & sales tooling", 240_000],
    ["Partner incentives", 290_000],
  ],
  Marketing: [
    ["Paid media", 1_450_000],
    ["Content & creative", 360_000],
    ["Events & sponsorships", 520_000],
    ["Agency retainers", 300_000],
  ],
  "Customer Success": [
    ["Salaries & benefits", 1_600_000],
    ["Support tooling", 190_000],
    ["Training & certification", 110_000],
    ["Customer travel", 140_000],
  ],
  "G&A": [
    ["Rent & facilities", 900_000],
    ["Legal & audit", 460_000],
    ["Insurance", 210_000],
    ["Office & equipment", 170_000],
  ],
};

/** Each region's size relative to North America. */
const REGION_SCALE: Readonly<Record<Region, number>> = {
  "North America": 1,
  EMEA: 0.62,
  APAC: 0.38,
};

/** A small deterministic PRNG (mulberry32). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const round = (value: number, step: number): number => Math.round(value / step) * step;

export function makeCostLines(): readonly CostLine[] {
  const random = seeded(2026);
  const lines: CostLine[] = [];
  for (const region of REGIONS) {
    for (const department of DEPARTMENTS) {
      for (const [item, base] of LINES[department]) {
        const yearly = base * REGION_SCALE[region] * (0.85 + random() * 0.3);
        // Spend ramps through the year, with some noise per quarter.
        const quarters = [0.23, 0.245, 0.255, 0.27].map((share) =>
          round(yearly * share * (0.9 + random() * 0.2), 100),
        );
        const actual = quarters.reduce((sum, value) => sum + value, 0);
        // Most lines land within 10% of plan; a few miss by more in either direction.
        const drift = random() < 0.18 ? 0.72 + random() * 0.56 : 0.92 + random() * 0.16;
        lines.push(
          Object.freeze({
            id: `${region}-${department}-${item}`,
            item,
            department,
            region,
            q1: quarters[0] ?? 0,
            q2: quarters[1] ?? 0,
            q3: quarters[2] ?? 0,
            q4: quarters[3] ?? 0,
            budget: round(actual * drift, 1000),
          }),
        );
      }
    }
  }
  return Object.freeze(lines);
}
