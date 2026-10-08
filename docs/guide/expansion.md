# Row expansion

Use expansion to show extra content beneath a data row. [Try the orders example](/examples/row-expansion).

```ts
const table = useDataTable({
  data: orders,
  columns: [{ id: "customer" }],
  getRowCanExpand: (order) => order.lines.length > 0,
  initialState: { expanded: ["order-1"] },
});
table.toggleExpanded("order-1");
table.expandAll();
table.collapseAll();
```

Rows expose `canExpand` and `isExpanded`. Custom renderers consume `table.renderItems`: each item has `kind` (`row` or `detail`), a stable `key`, its parent `row`, and the parent's `rowIndex` in `table.rows`. Use `item.key` for Vue keys and virtual measurements.

Details do not change `rows`, `rowCount`, pagination or grid positions. Sorting, searching, exports and edits operate on data rows.

## Full components

Both `VueyeTable` and `VueyeGrid` accept an `expanded` slot and controlled expansion:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { VueyeTable, type ExpandedState } from "vueye-table";
const expanded = ref<ExpandedState>([]);
const orders = [{ id: "order-1", customer: "Sample customer", notes: "Awaiting collection" }];
</script>

<template>
  <VueyeTable
    v-model:expanded="expanded"
    :data="orders"
    :columns="[{ id: 'customer' }]"
    expand-mode="single"
  >
    <template #expanded="{ row }">
      <p>{{ row.original.notes }}</p>
    </template>
  </VueyeTable>
</template>
```

The slot opts all rows into expansion. Use `:row-can-expand="order => order.lines.length > 0"`
to limit it. `expand` and `collapse` events receive `(item, row)` with current row metadata.
`row-can-expand` and `expand-mode` are creation options; remount to change them.

Content mounts on first open and unmounts on collapse. `keep-alive-detail` preserves local form
or component state in a hidden row while its parent remains on the current page. It also retains
visited content outside the virtual window; filtering, paging away from or removing its parent
unmounts it. Retention uses additional memory. Hidden details contribute no height or logical rows.
Colspan follows visible columns and gutters automatically. The grid disclosure gutter works with
`:row-numbers="false"`. Opt into `virtual` for variable-height measured detail items and keyed anchors.

[Try table, grid and virtual modes](/examples/hierarchy-components).

## Headless and styled composition

`DataTableRoot` provides disclosure IDs. `DataTableBody` has a `row` slot for each data row and a
`detail` slot receiving `{ row, rowIndex }`. The default whole-body slot remains an escape hatch;
when using it, render details yourself. Set `colspan` when adding your own selection or action columns.

```vue
<DataTableRoot :table="table" keep-alive-detail>
  <DataTableBody :colspan="table.columns.length + 1">
    <template #row="{ row }">
      <DataTableRow :row="row">
        <td><DataTableExpandToggle :row="row" /></td>
        <DataTableCell v-for="column in table.columns" :key="column.id" :row="row" :column="column" />
      </DataTableRow>
    </template>
    <template #detail="{ row }"><p>{{ row.original.notes }}</p></template>
  </DataTableBody>
</DataTableRoot>
```

`DataTableDetailRow` supports direct composition (`row`, `colspan`, optional `keep-alive`).
`DataGridBody` also accepts a `detail` slot; supply its own disclosure gutter for non-tree details.
Styled equivalents are `VtExpandToggle`, `VtDetailRow`, `VtTreeCell`; `VtTable` and `VtGrid` forward
their `expanded` slot. `VtBody` exposes `row` and `detail` slots. No detail content is mounted before
it first opens, including with retention enabled.

## Application-owned rich HTML

Cell values and ordinary slot interpolation are escaped text. Packages do not render raw HTML.
Prefer Vue components or interpolation in expanded slots too. If your application accepts HTML,
sanitize it before it reaches the slot and keep sanitizer dependencies in your application.
For example, sanitize on your server with `dompurify` and an up-to-date `jsdom`, following
[DOMPurify's server guidance](https://github.com/cure53/DOMPurify#running-dompurify-on-the-server):

```ts
// Application server module; never import this module into the client bundle.
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
const purifier = createDOMPurify(new JSDOM("").window);
export function sanitizeNotes(input: string): string {
  return purifier.sanitize(input, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });
}
```

Return only the sanitized string with your application's row data. The application's slot may
then use `<div v-html="row.original.sanitizedNotes" />`. Never bind an unsanitized value there or
modify sanitized markup before insertion. This example deliberately excludes links and media;
define and review a broader policy if your application requires them.

## State and operations

`state.expanded` is a readonly key array or `true`. The default is `[]`. `true` expands every eligible row, including new data. Closing one row in this mode converts the state into the remaining known eligible keys. Unknown, filtered or removed keys remain saved and reopen when their rows return.

`toggleExpanded(key, expanded?)` toggles one eligible row or sets its explicit state. Missing and ineligible rows are no-ops. `expandAll()` and `collapseAll()` update expansion in one operation. Controlled state and `onStateChange` work as with other state fields. `setState` does not call `onStateChange`; `reset` restores initial expansion.

`expandMode: 'single'` allows one open key. Opening another row replaces the previous key in one notification. State arrays use their last key; `true` and `expandAll()` choose the first eligible processed row. `expandMode` and `getRowCanExpand` are read when creating the table.

Invalid runtime state falls back to `[]` and appears in `table.issues` as `invalid_expanded`; duplicates are removed. A full `TableState` literal now requires `expanded`. You can store expansion in your own URL adapter; no query parameter is written automatically.

See [ADR 0007](/adr/0007-expansion-and-trees) for the shared render-item contract and the [tree guide](/guide/trees) for hierarchical child rows.
