# Editing and spreadsheets

`<VueyeGrid>` is a spreadsheet over an array: cells edit in place, ranges select with the keyboard
or the mouse, and copy, cut, paste, clear, undo, and redo work as they do in a spreadsheet
application. The array you pass in is never changed. Every edit produces a new array.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { defineColumns } from "vueye-table";

interface Line {
  id: number;
  item: string;
  quantity: number;
  price: number;
}

const lines = shallowRef<readonly Line[]>([
  { id: 1, item: "Keyboard", quantity: 2, price: 49.5 },
  { id: 2, item: "Monitor", quantity: 1, price: 219 },
]);

const columns = defineColumns<Line>([
  { id: "item" },
  { id: "quantity", align: "end" },
  { id: "price", align: "end", format: (price) => price.toFixed(2) },
  { id: "total", accessor: (line) => line.quantity * line.price, align: "end" },
]);
</script>

<template>
  <VueyeGrid v-model:data="lines" :columns="columns" column-letters />
</template>
```

Cells of `<VueyeGrid>` are editable unless their column says otherwise; `:editable="false"` locks
the whole grid. A computed column without `setValue`, such as `total`, is read-only and shows so.

## Keyboard

| Keys                                 | Action                                                |
| ------------------------------------ | ----------------------------------------------------- |
| Arrows                               | Move the active cell.                                 |
| Shift + arrows                       | Extend the selected range.                            |
| Ctrl/Cmd + arrows, Home, End         | Jump to the edge of the grid or the row.              |
| Tab, Shift + Tab                     | Move right or left.                                   |
| Enter, F2, double click              | Edit the active cell with its text.                   |
| Any character                        | Edit the active cell, starting with that character.   |
| Enter, Shift + Enter (while editing) | Save and move down or up.                             |
| Tab, Shift + Tab (while editing)     | Save and move right or left.                          |
| Escape (while editing)               | Discard the draft.                                    |
| Delete, Backspace                    | Clear the editable cells of the range.                |
| Ctrl/Cmd + C, X, V                   | Copy, cut, and paste the range as tab-separated text. |
| Ctrl/Cmd + Z, Shift + Z or Y         | Undo and redo.                                        |
| Ctrl/Cmd + A                         | Select every cell on the page.                        |
| Escape                               | Collapse the range to the active cell.                |

The clipboard uses the format spreadsheet applications write, so a range copied from Excel, Google
Sheets, or Numbers pastes cell for cell, with quoted fields and line breaks inside cells.

## From text to values

Typed and pasted text becomes a value in this order:

1. The column's `parse`, when it has one. Throwing refuses the text with the error's message.
2. The column's `type`: `"number"`, `"boolean"` (yes, no, true, false, 1, 0, on, off), `"date"`,
   or `"text"`.
3. The type of the value already in the cell, or of the column's value in another row when the
   cell is empty.

Empty text clears a number, boolean, or date cell to `null`.

```ts
{
  id: "price",
  editable: true,
  // Accept "$1,299.00" as well as "1299".
  parse: (input) => {
    const value = Number(input.replace(/[$,\s]/gu, ""));
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`"${input}" is not a price`);
    }
    return Math.round(value * 100) / 100;
  },
}
```

## Refused cells

A batch of edits (one cell, a pasted range, or a cleared range) applies every cell it can and
refuses the rest with a reason. Nothing is written for a refused cell and nothing is dropped
silently: `edit-error` receives one issue per refusal.

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { TableIssue } from "vueye-table";

const problems = ref<readonly TableIssue[]>([]);
</script>

<template>
  <VueyeGrid
    v-model:data="lines"
    :columns="columns"
    @edit="problems = []"
    @edit-error="problems = $event"
  />
  <p v-for="problem in problems" :key="problem.message" role="alert">
    {{ problem.message }}
  </p>
</template>
```

| Code             | Why the cell was refused                                  |
| ---------------- | --------------------------------------------------------- |
| `invalid_value`  | The text could not be read, or `parse` threw.             |
| `read_only_cell` | The column is not editable for that row, or cannot write. |
| `unknown_row`    | No row has the key the edit named.                        |
| `unknown_column` | No column has the id the edit named.                      |

## Events

| Event         | Payload                                                    |
| ------------- | ---------------------------------------------------------- |
| `update:data` | The new array, after an edit, paste, clear, undo, or redo. |
| `edit`        | The changes: `{ rowKey, column, previous, value, row }[]`. |
| `edit-error`  | The issues of refused cells.                               |
| `export`      | CSV of every filtered row, from the toolbar button.        |

`edit` is the place to save changes to a server: it names exactly the cells that changed and their
previous values, so a failed save can be rolled back.

## Custom cells

A `cell.<column id>` slot draws a column's cells while they are not being edited. The editor still
opens on Enter, F2, typing, or a double click.

```vue
<VueyeGrid v-model:data="stock" :columns="columns">
  <template #cell.onHand="{ value, item }">
    <span :class="{ low: value < item.reorderPoint }">{{ value }}</span>
  </template>
</VueyeGrid>
```

## Editing in your own components

Everything above is built on the engine, so a table you compose yourself edits the same way:

```ts
const table = useDataTable({ data: lines, columns, onDataChange: (next) => (lines.value = next) });

table.edit({ rowKey: 2, column: "quantity", input: "3" }); // read by the column
table.edit({ rowKey: 2, column: "item", value: "4K monitor" }); // a value of the column's type
table.paste({ row: 0, column: 1 }, "4\t12.5\n2\t8");
table.undo();
```

`useDataGrid(table)` adds the spreadsheet selection and keyboard handling, and the headless
`<DataGridRoot>` renders it with `role="grid"`, `aria-activedescendant`, and clipboard events. The
reasoning is in [ADR 0003](/adr/0003-editing-and-spreadsheets).
