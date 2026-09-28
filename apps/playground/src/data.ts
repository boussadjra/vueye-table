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

/** A pretend server: searches, sorts, and pages, then answers after a short delay. */
export async function fetchPage(
  all: readonly Employee[],
  query: {
    page: number;
    pageSize: number;
    search: string;
    sort?: { column: string; direction: "asc" | "desc" };
  },
): Promise<{ rows: Employee[]; total: number }> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const term = query.search.toLowerCase();
  let rows = all.filter((row) =>
    term === ""
      ? true
      : `${row.name.first} ${row.name.last} ${row.email} ${row.department}`
          .toLowerCase()
          .includes(term),
  );
  if (query.sort) {
    const { column, direction } = query.sort;
    const read = (row: Employee): string | number =>
      column === "salary" ? row.salary : column === "name.last" ? row.name.last : row.department;
    rows = rows.toSorted((a, b) => {
      const left = read(a);
      const right = read(b);
      const order = left < right ? -1 : left > right ? 1 : 0;
      return direction === "asc" ? order : -order;
    });
  }
  const start = (query.page - 1) * query.pageSize;
  return { rows: rows.slice(start, start + query.pageSize), total: rows.length };
}
