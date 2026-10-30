import { createTable, type DataTable } from "@vueye-table/core";
import { bench, describe } from "vitest";

interface Entry {
  id: number;
  region: string;
  team: string;
  amount: number;
}
for (const count of [10_000, 100_000]) {
  const seed = Array.from({ length: count }, (_, id) => ({
    id,
    region: `Region ${id % 100}`,
    team: `Team ${Math.floor(id / 100) % 20}`,
    amount: id % 1000,
  }));
  const make = (): DataTable<Entry> =>
    createTable({
      data: seed,
      columns: [{ id: "region" }, { id: "team" }, { id: "amount", aggregate: "sum" }],
      initialState: { grouping: ["region", "team"], pagination: { page: 1, pageSize: 5 } },
    });
  const incoming = Array.from({ length: 100 }, (_, index) => ({
    ...seed[index]!,
    id: count + index,
  }));
  let table: DataTable<Entry>;
  describe(`${count} rows, two grouping levels`, () => {
    bench(
      "initial grouping and snapshot",
      () => {
        const current = make();
        current.getSnapshot();
        current.destroy();
      },
      { time: 20, iterations: 5, warmupTime: 2, warmupIterations: 1 },
    );
    for (const operation of ["expand", "append"] as const)
      bench(
        operation === "expand" ? "cached collapse and expand" : "append 100 rows and snapshot",
        () => {
          if (operation === "expand") {
            table.collapseAllGroups();
            table.getSnapshot();
            table.expandAllGroups();
            table.getSnapshot();
          } else {
            table.appendData(incoming);
            table.getSnapshot();
          }
        },
        {
          setup(task) {
            const prepare = (): void => {
              table?.destroy();
              table = make();
              table.getSnapshot();
            };
            task.opts.beforeEach = prepare;
            prepare();
          },
          time: 20,
          iterations: 5,
          warmupTime: 2,
          warmupIterations: 1,
        },
      );
  });
}
