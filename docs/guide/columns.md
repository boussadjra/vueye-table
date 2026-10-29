# Columns

Editable columns also accept typed `validate` callbacks and serializable `editor` constraints.
These receive values and plain text messages; core produces no HTML. See
[Validation and changes since save](/guide/validation) for direct-edit/paste enforcement and async behavior.

A column says where a cell's value comes from and how it is shown, sorted, filtered, and edited.
Columns are plain objects, declared once with `defineColumns<Row>()` so every callback is typed by
your row.

```ts
import { defineColumns } from "vueye-table";

interface Order {
  id: string;
  customer: { name: string; email: string };
  total: number;
  status: "pending" | "paid" | "shipped" | "refunded";
  placedAt: string; // "2026-09-14"
}

const columns = defineColumns<Order>([
  { id: "id", header: "Order", width: 110 },
  { id: "customer.name", header: "Customer" },
  { id: "total", align: "end", format: (total) => `$${total.toFixed(2)}` },
  { id: "status" },
  { id: "placedAt", header: "Placed" },
]);
```

## Path columns

A column whose `id` is a path reads `row[id]`, following dots into nested objects. The id is typed:
`"customer.name"` is accepted because `Order` has it, and `format` above receives a `number` because
`total` is one. A misspelled path is a type error, not an empty column.

Without `header`, the id is made readable: `"placedAt"` becomes "Placed at" and
`"customer.name"` becomes "Customer name".

## Computed columns

Give a column an `accessor` to compute its value from the row. The `id` is then any name you
choose.

```ts
{
  id: "margin",
  accessor: (line) => line.price - line.cost,
  format: (margin) => `${margin.toFixed(2)} €`,
  align: "end",
}
```

A computed column is read-only unless it also has `setValue`, which returns a copy of the row
carrying the new value:

```ts
{
  id: "fullName",
  accessor: (person) => `${person.first} ${person.last}`,
  setValue: (person, value) => {
    const [first = "", ...rest] = String(value).split(" ");
    return { ...person, first, last: rest.join(" ") };
  },
  editable: true,
}
```

## Options

| Option       | Default          | What it does                                                            |
| ------------ | ---------------- | ----------------------------------------------------------------------- |
| `header`     | the id, readable | Header text.                                                            |
| `align`      | `"start"`        | `"start"`, `"center"`, or `"end"`. Use `"end"` for numbers.             |
| `width`      |                  | Width in pixels.                                                        |
| `minWidth`   |                  | Minimum width in pixels.                                                |
| `maxWidth`   |                  | The widest a user may resize the column, in pixels.                     |
| `resizable`  | `true`           | Whether a user may give the column another width.                       |
| `pinned`     |                  | Initial logical pin side: `"start"` or `"end"`.                         |
| `pinnable`   | `true`           | Whether a user may pin the column.                                      |
| `sortable`   | `true`           | Whether a user may sort by the column.                                  |
| `searchable` | `true`           | Whether the free-text search looks at the column.                       |
| `hidden`     | `false`          | Hidden until a user shows it.                                           |
| `format`     | locale-free text | The text a cell shows, searches, copies, and exports.                   |
| `compare`    | natural order    | How two values sort. The engine flips it for descending sorts.          |
| `filter`     | see below        | Whether a row passes the column's filter value.                         |
| `editable`   | `false`          | Whether cells accept edits; a function decides per row.                 |
| `type`       | the value's type | How typed text is read: `"text"`, `"number"`, `"boolean"`, or `"date"`. |
| `parse`      | reads by `type`  | Turns typed or pasted text into a value. Throw to refuse it.            |
| `meta`       | `{}`             | Anything your own renderer needs. The engine never reads it.            |

## Widths and resizing

`width` is the width a column starts with. A width a user gives a column lives in the table state,
as `columnSizing`, so it can be saved, restored, and written to the URL like sorting or hidden
columns. Each column the snapshot hands a renderer carries the width to draw:

```ts
const table = createTable({
  data: orders,
  columns: [
    { id: "id", width: 110, resizable: false },
    { id: "customer", width: 220, minWidth: 120, maxWidth: 480 },
  ],
});

table.resizeColumn("customer", 600);
table.getSnapshot().getColumn("customer")?.width; // 480, kept within maxWidth
table.getState().columnSizing; // { customer: 480 }
table.resetColumnSize("customer"); // back to 220
```

`resizeColumn` keeps a width within `minWidth` and `maxWidth`, and ignores columns marked
`resizable: false` and widths that are not a positive number. Resizing never changes the page and
never re-runs search, filters, or sorting. `resetColumnSize()` with no id returns every column to
its own width, and `reset()` does too. A state entry that names an unknown column, holds something
other than a positive number, or targets a column that is not resizable is ignored and reported in
`snapshot.issues`.

On a column, `width` is the width to draw, `defaultWidth` is the definition's `width`, and
`isResized` tells whether the width came from the state. The components do not draw resize
handles yet; until they do, call `resizeColumn` from your own header markup.

## Pinning columns

`pinned: "start" | "end"` seeds `state.columnPinning`, whose two arrays store ids in pin order.
An explicit initial `columnPinning` replaces those defaults, including an empty pair of arrays.
`pinColumn(id, "start" | "end" | false)` moves a column to a side or unpins it. Repeating the
same pin is a no-op. A hidden column keeps its pin and uses no pinned width.

```ts
const table = createTable({
  data: orders,
  columns: [
    { id: "id", width: 108, pinned: "start" },
    { id: "customer", width: 208 },
    { id: "total", width: 112, pinned: "end" },
  ],
});
table.pinColumn("customer", "start");
table.getSnapshot().getColumn("customer")?.pinOffset; // 108
table.resizeColumn("id", 160);
table.getSnapshot().getColumn("customer")?.pinOffset; // 160
table.pinColumn("customer", false);
```

The snapshot keeps one display order: start pins, centre columns ordered by `columnOrder`, then
end pins. Grid indices, keyboard navigation, clipboard ranges, and default exports all follow
that list. `moveColumn(id, toIndex)` uses all-column display indices (including hidden columns)
and clamps the move to the column's current region; use `pinColumn` to change regions. Pinning,
moving, hiding and resizing columns do not change the page or rerun the row pipeline.

Renderers read `column.pinned`, `column.pinOffset`, and `column.isPinnedEdge`. A start offset is
the sum of visible widths before that column; an end offset is the sum after it, measured from
the logical end. The last visible start pin and first visible end pin carry the edge marker.
`snapshot.pinnedStartWidth` and `pinnedEndWidth` expose total visible widths. Logical offsets work
with CSS `inset-inline-start` and `inset-inline-end` in LTR and RTL.

A pinned column without a finite positive width uses a finite positive `minWidth`, then 120px,
and reports `unsized_pinned_column`. Unknown ids report `unknown_column`; forbidden pins report
`column_not_pinnable`. Repeated ids on one side keep their first entry with `duplicate_column_pin`;
an id on both sides is left unpinned with the same issue. The host's state entries are retained,
so a removed column can regain its pin when its definition returns. Malformed pinning state
recovers to empty regions with `invalid_column_pinning`. Refused `pinColumn` calls leave state
unchanged and report the last operation issue until the next valid pin call or `reset()`.

Try the [live example](/examples/column-pinning), which supplies custom sticky cells. Built-in
component controls and centre-only horizontal virtualization remain follow-up work. The public
contract is recorded in [ADR 0024](/adr/0024-column-sizing-and-pinning).

## Formatting

`format` decides the text of a cell everywhere at once: what it shows, what search matches, what
copy puts on the clipboard, and what CSV export writes. Keep it a pure function of the value and
the row.

```ts
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

{ id: "total", align: "end", format: (total) => money.format(total) }
```

Without `format`, values are written without depending on the runtime's locale, so the server and
the browser render the same text: numbers as `String(n)`, dates in ISO form, arrays joined with
commas.

To draw something richer than text (a badge, an avatar, a bar), keep `format` for the text and use
a cell slot for the markup. Search and export keep working on the text.

```vue
<VueyeTable :data="orders" :columns="columns">
  <template #cell.status="{ value, display }">
    <span class="pill" :data-status="value">{{ display }}</span>
  </template>
</VueyeTable>
```

## Sorting

Values sort naturally without configuration: numbers by size, dates by time, booleans false before
true, and text with a numeric-aware collator, so "Item 2" comes before "Item 10". Empty values
stay last in both directions. Shift-click a header to sort by several columns.

Give `compare` for any other order, such as a workflow:

```ts
const stages = ["lead", "qualified", "proposal", "won", "lost"];

{
  id: "stage",
  compare: (left, right) => stages.indexOf(left) - stages.indexOf(right),
}
```

## Filtering

`table.filter(columnId, value)` sets a column's filter, and `v-model:filters` holds every one of
them as `{ [columnId]: value }`. An empty value (`undefined`, `null`, `""`, `[]`) removes the
filter. Without a `filter` function, the value decides how rows match:

| Filter value           | Keeps rows whose value…                                  |
| ---------------------- | -------------------------------------------------------- |
| `["paid", "shipped"]`  | is one of the items.                                     |
| `{ min: 10, max: 50 }` | lies in the inclusive range. Either end may be left out. |
| `"bos"`                | shows text containing it, ignoring case.                 |
| anything else          | is identical to it.                                      |

Range bounds may be text, as they arrive from an `<input>`: `{ min: "10" }` compares with numbers
as a number, and `{ min: "2026-01-01" }` compares with dates as a date. An empty bound leaves that
end open.

A `filter` function covers anything else. It receives the cell's value, the filter value, and the
row:

```ts
{
  id: "tags",
  // Keep contacts that carry every selected tag.
  filter: (tags, selected) => (selected as string[]).every((tag) => tags.includes(tag)),
}
```

## Editing

A column accepts edits when `editable` is `true` or returns `true` for the row. Typed and pasted
text is read by `parse`, or by `type`, or by the type of the value already in the cell. Text that
cannot be read is refused and reported, never written. The [editing guide](/guide/editing) covers
the whole flow.

```ts
{
  id: "quantity",
  editable: (line) => !line.locked,
  parse: (input) => {
    const value = Number(input);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Quantity must be a whole number, 0 or more");
    }
    return value;
  },
}
```

## Inferred columns

Without `columns`, `<VueyeTable>` and `<VueyeGrid>` infer one path column per field of the first
rows, with nested objects flattened into dotted paths. It is a quick way to look at data; declare
columns for anything you ship.

```ts
import { inferColumns } from "vueye-table";

inferColumns([{ id: 1, name: { first: "Ada" } }]); // [{ id: "id" }, { id: "name.first" }]
```
