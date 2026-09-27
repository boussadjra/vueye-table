# @vueye-table/core

The framework-independent engine behind vueye-table: typed column definitions, searching,
filtering, stable multi-column sorting, pagination, selection, column visibility and order,
editing with undo, spreadsheet addressing, clipboard text, and CSV export. No DOM, no Node.js,
no framework.

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
