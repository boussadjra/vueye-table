---
aside: false
---

<script setup lang="ts">
import InventorySheet from "../.vitepress/theme/examples/inventory/InventorySheet.vue";
</script>

# Inventory sheet

A warehouse manager keeps stock counts, costs, and reorder points for forty SKUs in a spreadsheet.
This page is that sheet, built on `<VueyeGrid v-model:data>`: typed parsers that reject bad input
with a readable reason, computed read-only columns, `cell.<id>` slots for conditional formatting,
totals that follow every edit, a category filter, and a CSV download.

<InventorySheet />

Try it: select an **On hand** cell, type `4`, and press Enter; the row turns low and the totals
move. Type `-5` or `2.5` and the cell is kept as it was, with the reason listed above the grid. Copy
a few cells from any spreadsheet application and paste them onto the grid.

## How it works

### Parsers reject, they never guess

A column's `parse` turns typed or pasted text into a value. Throwing rejects that one cell: the
grid keeps the old value and reports an issue whose message is the error's. The same parser runs
for every pasted cell, so a range from Excel is checked cell by cell and the good cells still
apply.

```ts
function quantity(label: string): (input: string) => number {
  return (input) => {
    const text = input.trim().replace(/[\s,_]/gu, "");
    if (text === "") return 0; // Delete clears a count to zero
    const value = Number(text);
    if (!/^[-+]?\d*\.?\d+$/u.test(text)) throw new Error(`${label} must be a number, not "${input}".`);
    if (value < 0) throw new Error(`${label} can't be negative (you entered ${text}).`);
    if (!Number.isInteger(value)) throw new Error(`${label} counts whole units (you entered ${text}).`);
    return value;
  };
}

{ id: "onHand", header: "On hand", align: "end", parse: quantity("On hand") },
{ id: "unitCost", format: (cost) => cost.toFixed(2), parse: parseMoney }, // "$12.50", "12,50"
```

Typed editors start from the underlying value. `format` supplies copied and exported text;
the cell slot adds the visible currency symbol.

### Typed controls and async SKU checks

Category and warehouse use select editors; quantities and cost use numeric editors with core
constraints. SKU uses delayed validation against the current rows and a simulated reserved
value, `TAKEN-001`. A separate immutable `id` is the row key, so editing a SKU preserves identity.
The example does not contact a uniqueness service; real applications must check again on the server.

**Save changes** simulates a delayed save and calls `markSaved` only if the submitted data is
still current and validation has settled. **Revert changes** restores unsaved values. Undo
after saving creates new pending changes. See [validation and saving](/guide/validation).

### Computed columns with `accessor`

Stock value and status are not stored. An `accessor` column reads them from the row, and without a
`setValue` it is read-only: typing into it does nothing, and pasting over it reports a
`read_only_cell` issue. A custom `compare` sorts status by urgency instead of alphabetically.

```ts
{ id: "value", header: "Stock value", accessor: (item) => item.onHand * item.unitCost,
  format: (value: number) => value.toFixed(2), align: "end" },
{ id: "status", accessor: stockStatus, compare: (a, b) => RANK[a] - RANK[b] },
```

### Conditional formatting through `cell.<id>` slots

A `cell.<column id>` slot on `<VueyeGrid>` draws a cell while it is not being edited. It receives
the row's data as `item`, the raw `value`, and the formatted `display`. Enter, F2, or typing still
opens the editor over the slot, seeded with the underlying value for typed editors.

```vue
<VueyeGrid v-model:data="rows" :columns="columns" row-key="id" column-letters>
  <template #cell.onHand="{ item, display }">
    <span class="on-hand" :data-tone="toneOf(item)">
      <span class="meter"><span class="meter-fill" :style="{ width: `${fill(item)}%` }" /></span>
      <span class="qty">{{ display }}</span>
    </span>
  </template>
  <template #cell.status="{ item, value }">
    <span class="pill" :data-tone="toneOf(item)">{{ value }}</span>
  </template>
</VueyeGrid>
```

The tone is a data attribute and the colors are CSS variables with a `.dark` override, so the
server render and the browser agree in both themes.

### Totals follow `v-model:data`

The grid never mutates the array it was given. Every edit, paste, undo, and redo hands back a new
array, so the summary strip is an ordinary `computed` over it; there is nothing to subscribe to.

```ts
const rows = shallowRef<readonly StockItem[]>(inventory);
const summary = computed(() => ({
  value: inScope.value.reduce((sum, item) => sum + stockValue(item), 0),
  low: inScope.value.filter((item) => stockStatus(item) === "Low").length,
  out: inScope.value.filter((item) => stockStatus(item) === "Out").length,
}));
```

### Rejections with A1 addresses

Cell refusals from `@edit-error` carry the row key and column id. A `paste_truncated` issue
describes the whole paste and has no cell address. `toA1` turns a
position into `"E7"`. Positions count what is shown, the row on the page and the column among the
visible columns, which is what the grid's row numbers and column letters display.

```ts
function addressOf(rowKey: unknown, columnId: string): string {
  const table = grid.value?.table; // exposed by <VueyeGrid ref="grid">
  const row = table.rows.findIndex((candidate) => candidate.key === rowKey);
  const column = table.columns.findIndex((candidate) => candidate.id === columnId);
  return row < 0 || column < 0 ? "" : toA1({ row, column });
}
```

### Filter and download

The category buttons set ordinary table state, `:filters="{ category: ['Audio'] }"`, where an array
keeps rows whose value is one of its items. The download calls the exposed `table.exportRows()`,
which writes the visible columns of every filtered row as their formatted text, and creates the
file inside the click handler, so nothing touches browser APIs while the page renders.
Formula-like text is escaped by default; numeric values formatted as numbers stay numeric.
See the [export and paste limits example](/examples/grid#export-and-paste-limits) for a comparison.

```ts
function download(): void {
  const csv = grid.value!.table.exportRows();
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-${category.value.toLowerCase()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

## Related

- [Columns](/guide/columns): `accessor`, `format`, `parse`, `compare`, and `editable`.
- [Editing](/guide/editing): edits, issues, paste, undo, and `v-model:data`.
- [State](/guide/state): filters and the other state a table keeps.
- [Components](/guide/components): `<VueyeGrid>` props, events, and slots.
- [Theming](/guide/theming): the custom properties behind the grid's colors.
