---
aside: false
---

<script setup lang="ts">
import { ref } from "vue";
import { defineColumns, type TableIssue } from "vueye-table";

import { useEditLog } from "../.vitepress/theme/edit-log";
import ContentBoundaries from "../.vitepress/theme/components/ContentBoundaries.vue";

interface Line {
  readonly id: number;
  readonly item: string;
  readonly quantity: number;
  readonly price: number;
  readonly taxable: boolean;
}

const columns = defineColumns<Line>([
  { id: "item" },
  { id: "quantity", align: "end" },
  { id: "price", align: "end", format: (price) => price.toFixed(2) },
  { id: "taxable" },
  {
    id: "total",
    accessor: (line) => line.quantity * line.price,
    format: (total) => (total as number).toFixed(2),
    align: "end",
  },
]);
const { rows: lines, edits, arrays, csv, onData, onEdit, onExport } = useEditLog<Line>(
  Object.freeze([
    { id: 1, item: "Keyboard", quantity: 2, price: 49.5, taxable: true },
    { id: 2, item: "Monitor", quantity: 1, price: 219, taxable: true },
    { id: 3, item: "Support plan", quantity: 12, price: 15, taxable: false },
    { id: 4, item: "Cables", quantity: 6, price: 4.25, taxable: true },
  ]),
  columns.map((column) => column.id),
);
const issues = ref<readonly TableIssue[]>([]);
</script>

# Spreadsheet

Click a cell and type, or press Enter to edit. Arrows move, Shift extends the range, and copy, cut,
paste, Delete, undo, and redo work like a spreadsheet. The total column is computed and read-only.

<DemoFrame title="OrderLines.vue">
  <VueyeGrid
    :data="lines"
    :columns="columns"
    label="Order lines"
    column-letters
    @update:data="onData"
    @edit="onEdit($event); issues = []"
    @edit-error="issues = $event"
    @export="onExport"
  >
    <template #cell.taxable="{ value }">
      <span class="flag" :data-on="value ? '' : undefined">{{ value ? "Taxable" : "Exempt" }}</span>
    </template>
  </VueyeGrid>
  <p v-for="issue in issues" :key="issue.message" class="issue" role="alert">{{ issue.message }}</p>
  <template v-slot:side>
    <EditLog :edits="edits" :arrays="arrays" :csv="csv" />
  </template>
</DemoFrame>

```vue
<VueyeGrid
  v-model:data="lines"
  :columns="columns"
  column-letters
  @edit-error="issues = $event"
  @edit="issues = []"
>
  <template #cell.taxable="{ value }">
    <span class="flag" :data-on="value ? '' : undefined">{{ value ? "Taxable" : "Exempt" }}</span>
  </template>
</VueyeGrid>
```

The `cell.taxable` slot draws the cell while it is not being edited. Type `yes`, `no`, `true`, or
`0` into it and the column's boolean type reads the text.

## Export and paste limits

CSV and TSV exports escape formula-like text by default. Clipboard copies keep literal text
unless you opt into escaping. Compare the previews below: `=1+1` gets an apostrophe in CSV,
while the numeric value `-12` stays numeric in both outputs. The checkboxes change the output
without changing the cells.

<ContentBoundaries />

**Paste sample** starts at A1 and changes the first five of nine fields. The remaining fields
produce a `paste_truncated` issue. **Undo** restores all five changes together. This small limit
makes the behavior visible; the defaults allow 100,000 fields and 5,000,000 UTF-16 code units.

The demo composes `VtGrid` with `useDataTable` to configure `pasteLimit`:

```ts
const table = useDataTable({
  data: rows,
  columns,
  pasteLimit: { maxCells: 5, maxLength: 128 },
  onDataChange: (next) => (rows.value = next),
  onEditIssues: (next) => (issues.value = next),
});

table.exportRows(); // CSV: formula-like text escaped
table.exportRows({ format: "tsv", escapeFormulas: false });
table.copy({ top: 0, left: 0, bottom: 2, right: 2 }, { escapeFormulas: true });
```

### Unsafe column paths

Column ids containing `__proto__`, `constructor`, or `prototype` in any path segment are
ignored and reported as `unsafe_path` snapshot issues. The path helpers apply the same rule:

```ts
import { getPath, setPath, type TableIssue } from "vueye-table";

const row = { name: "Ada" };
const issues: TableIssue[] = [];

getPath(row, "constructor.prototype.name"); // undefined
const next = setPath(row, "__proto__.name", "Grace", (issue) => issues.push(issue));
next === row; // true: the unsafe write leaves the input unchanged
issues[0]?.code; // "unsafe_path"
```

See [Editing](/guide/editing#paste-limits) for limits, issue handling, and the differences
between exported files and clipboard text.

<style scoped>
.flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--vp-c-text-3);
}

.flag::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentcolor;
  opacity: 0.6;
}

.flag[data-on] {
  color: var(--vp-c-brand-1);
}

.issue {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--vp-c-danger-1);
}
</style>
