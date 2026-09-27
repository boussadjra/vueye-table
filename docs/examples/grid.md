<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { useData } from "vitepress";
import { defineColumns, type TableIssue } from "vueye-table";

interface Line {
  readonly id: number;
  readonly item: string;
  readonly quantity: number;
  readonly price: number;
  readonly taxable: boolean;
}

const { isDark } = useData();
const lines = shallowRef<readonly Line[]>([
  { id: 1, item: "Keyboard", quantity: 2, price: 49.5, taxable: true },
  { id: 2, item: "Monitor", quantity: 1, price: 219, taxable: true },
  { id: 3, item: "Support plan", quantity: 12, price: 15, taxable: false },
  { id: 4, item: "Cables", quantity: 6, price: 4.25, taxable: true },
]);
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
const issues = ref<readonly TableIssue[]>([]);
</script>

# Spreadsheet

Click a cell and type, or press Enter to edit. Arrows move, Shift extends the range, and copy, cut,
paste, Delete, undo, and redo work like a spreadsheet. The total column is computed and read-only.

<div class="demo">
  <VueyeGrid
    v-model:data="lines"
    :columns="columns"
    :theme="isDark ? 'dark' : 'light'"
    column-letters
    @edit-error="issues = $event"
    @edit="issues = []"
  />
  <p v-for="issue in issues" :key="issue.message" role="alert">{{ issue.message }}</p>
</div>

```vue
<VueyeGrid
  v-model:data="lines"
  :columns="columns"
  column-letters
  @edit-error="issues = $event"
  @edit="issues = []"
/>
```
