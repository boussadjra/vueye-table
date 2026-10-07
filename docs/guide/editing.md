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

Business validation, enforced editor limits, async batches, row insertion/removal and saved
baselines are described in [Validation and changes since save](/guide/validation).

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

| Code              | Why the cell was refused                                   |
| ----------------- | ---------------------------------------------------------- |
| `invalid_value`   | The text could not be read, or `parse` threw.              |
| `read_only_cell`  | The column is not editable for that row, or cannot write.  |
| `unknown_row`     | No row has the key the edit named.                         |
| `unknown_column`  | No column has the id the edit named.                       |
| `unsafe_path`     | The column id contains a prototype-sensitive path segment. |
| `paste_truncated` | The paste exceeds the visible grid or a parsing limit.     |

## Paste limits

Pasting starts at the selected range's top-left cell and fills the visible grid from that
position; the selection's size does not limit the paste. Parsing stops once the destination
is filled. Extra columns are skipped without storing their text so later rows stay aligned.

`createTable` and `useDataTable` accept `pasteLimit`:

```ts
const table = useDataTable({
  data: lines,
  columns,
  pasteLimit: { maxCells: 10_000, maxLength: 1_000_000 },
  onDataChange: (next) => (lines.value = next),
});
```

The defaults are 100,000 parsed fields, including skipped columns, and 5,000,000 UTF-16 code
units examined. Both limits must be positive safe integers. Invalid limits fall back to the
defaults and appear as `invalid_paste_limit` issues in the table snapshot.

If input exceeds the grid or either limit, `paste()` returns a `paste_truncated` issue and
`onEditIssues` / `edit-error` receives it. Complete cells still apply as one undo batch.
The status is `partial` when some values change and `rejected` when no values change. A field
cut short by the character limit is discarded rather than written as an incomplete value.

Try the [export and paste limits example](/examples/grid#export-and-paste-limits) to compare
output text and undo a partially applied paste.

## Exported formulas and clipboard text

`exportRows()` defaults to `escapeFormulas: true` for both CSV and TSV. Cell text and headers
starting with `=`, `+`, `-`, `@`, tab, carriage return, line feed, or the full-width
versions of those four formula prefixes receive an apostrophe before normal delimited
quoting. Text `"-12"` is escaped; the numeric value `-12` formatted as a number is preserved.
A custom formatter that produces formula-like text is escaped even for a numeric value.
The rows and displayed cell values do not change.

```ts
table.exportRows({ format: "csv" }); // formula-like text escaped
table.exportRows({ escapeFormulas: false }); // literal text, for a trusted destination
table.copy(range, { escapeFormulas: true });
grid.copy({ escapeFormulas: true });
```

Clipboard copies default to `escapeFormulas: false` to preserve existing spreadsheet editing
and round trips. Escaping changes the output text. Spreadsheet applications differ in how
they handle CSV and saved files, so this option does not guarantee safety after a file is
edited or saved again; see [OWASP's CSV injection guidance](https://owasp.org/www-community/attacks/CSV_Injection).

## Events

| Event         | Payload                                                    |
| ------------- | ---------------------------------------------------------- |
| `update:data` | The new array, after an edit, paste, clear, undo, or redo. |
| `edit`        | The changes: `{ rowKey, column, previous, value, row }[]`. |
| `edit-error`  | Refused-cell issues and paste truncation issues.           |
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
