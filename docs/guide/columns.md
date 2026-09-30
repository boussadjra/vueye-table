# Columns

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
