import { createTable, type DataTable } from "@vueye-table/core";
import { bench, describe } from "vitest";

interface Entry {
  readonly id: number;
  readonly value: number;
}
for (const count of [10_000, 100_000]) {
  for (const sorted of [false, true]) {
    const seed = Array.from({ length: count }, (_, id) => ({ id, value: id % 100 }));
    const incoming = Array.from({ length: 100 }, (_, offset) => ({
      id: count + offset,
      value: offset % 100,
    }));
    let table: DataTable<Entry>;
    describe(`${count} existing rows`, () => {
      bench(
        `append 100 ${sorted ? "sorted" : "unsorted"} rows and publish`,
        () => {
          table.appendData(incoming);
          table.getSnapshot();
        },
        {
          setup(task) {
            const prepare = (): void => {
              table = createTable({
                data: seed,
                columns: [{ id: "value" }],
                initialState: { sorting: sorted ? [{ column: "value", direction: "asc" }] : [] },
                onDataChange: () => undefined,
              });
              table.getSnapshot();
            };
            task.opts.beforeEach = prepare;
            prepare();
          },
          time: 20,
          warmupTime: 2,
          iterations: 5,
          warmupIterations: 2,
        },
      );
    });
  }
}
