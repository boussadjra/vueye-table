import { createTable } from "@vueye-table/core";
import { bench, describe } from "vitest";

interface Node {
  readonly id: number;
  readonly name: string;
  readonly parent: number | undefined;
}
const timing = { time: 300, warmupTime: 100, iterations: 3, warmupIterations: 1 };
for (const count of [10_000, 100_000]) {
  for (const depth of [3, 10]) {
    const data: readonly Node[] = Array.from({ length: count }, (_, id) => ({
      id,
      name: `Node ${count - id}`,
      parent: id % depth === 0 ? undefined : id - 1,
    }));
    const make = () =>
      createTable<Node>({
        data,
        columns: [{ id: "name" }],
        paginate: false,
        getParentKey: (row) => row.parent,
      });
    describe(`${count} nodes / ${depth} levels`, () => {
      bench(
        "build",
        () => {
          make().getSnapshot();
        },
        timing,
      );
      const filter = make();
      filter.getSnapshot();
      let search = false;
      bench(
        "filter",
        () => {
          search = !search;
          filter.search(search ? "Node 99" : "Node 88");
          filter.getSnapshot();
        },
        timing,
      );
      const sort = make();
      sort.getSnapshot();
      let ascending = false;
      bench(
        "sort",
        () => {
          ascending = !ascending;
          sort.sort("name", ascending ? "asc" : "desc");
          sort.getSnapshot();
        },
        timing,
      );
      const all = make();
      all.getSnapshot();
      bench(
        "expand all + collapse",
        () => {
          all.expandAll();
          all.getSnapshot();
          all.collapseAll();
          all.getSnapshot();
        },
        timing,
      );
      const single = make();
      single.getSnapshot();
      let open = false;
      bench(
        "single toggle",
        () => {
          open = !open;
          single.toggleExpanded(0, open);
          single.getSnapshot();
        },
        timing,
      );
    });
  }
}
