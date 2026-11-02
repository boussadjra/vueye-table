# @vueye-table/core

The framework-independent engine behind vueye-table: typed column definitions, searching,
filtering, stable multi-column sorting, pagination, selection, column visibility and order,
editing with undo, spreadsheet addressing, clipboard text, and CSV export. No DOM, no Node.js,
no framework.

Column sizing and logical start/end pinning share serializable layout state. Flat client tables
support nested grouping, filtered-leaf aggregates and group expansion; top/bottom pinned rows
stay outside the grouped/paginated centre. `gridRows` supplies data-cell coordinates across all
three row regions. See [columns](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/columns.md),
[grouping](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/grouping.md) and
[row pinning](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/row-pinning.md).

Nested and adjacency trees share sibling sorting, hierarchical filtering, cascading selection,
immutable child edits and lazy loading with injected cancellation. Read the
[tree guide](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/trees.md) for the API and runnable example.

Append cursor batches, upsert keyed source records, or consume cancellable async iterables without clearing local edits. Read the [streaming guide](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/streaming.md) and [runnable source example](https://github.com/boussadjra/vueye-table/blob/main/examples/streaming.ts) for load state, conflict reporting and undo retention.

```bash
pnpm add @vueye-table/core
```

```ts
import { createTable } from "@vueye-table/core";

const table = createTable({
  data: users,
  columns: [
    { id: "name.first", header: "First name" },
    { id: "age", align: "end" },
  ],
  initialState: { pagination: { page: 1, pageSize: 20 } },
  onStateChange: (state) => console.log(state.sorting),
});

table.search("ada");
table.toggleSort("age");
const { rows, pageCount, issues } = table.getSnapshot();
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
