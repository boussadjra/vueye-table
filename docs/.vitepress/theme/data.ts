export interface Employee {
  readonly id: number;
  readonly name: { readonly first: string; readonly last: string };
  readonly email: string;
  readonly department: string;
  readonly salary: number;
  readonly active: boolean;
  readonly started: string;
}

const firsts = [
  "Ada",
  "Alan",
  "Grace",
  "Edsger",
  "Barbara",
  "Donald",
  "Margaret",
  "Linus",
  "Radia",
  "Ken",
];
const lasts = [
  "Lovelace",
  "Turing",
  "Hopper",
  "Dijkstra",
  "Liskov",
  "Knuth",
  "Hamilton",
  "Torvalds",
  "Perlman",
  "Thompson",
];
const departments = ["Engineering", "Design", "Sales", "Support", "Finance"];

/** Deterministic sample data, so every visit shows the same rows. */
export function makeEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, index) => {
    const first = firsts[index % firsts.length] as string;
    const last = lasts[(index * 7) % lasts.length] as string;
    return {
      id: index + 1,
      name: { first, last },
      email: `${first}.${last}${index}@example.com`.toLowerCase(),
      department: departments[(index * 3) % departments.length] as string,
      salary: 40_000 + ((index * 7919) % 90_000),
      active: index % 4 !== 0,
      started: `20${String(10 + (index % 15)).padStart(2, "0")}-${String((index % 12) + 1).padStart(2, "0")}-15`,
    };
  });
}
