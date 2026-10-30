# Row grouping and aggregation

Group flat client data by one or more columns, with nested groups and aggregates over every
filtered leaf. Use `createTable` or `useDataTable` with a custom body; built-in group rows and
controls are follow-up work. Try the [runnable example](/examples/row-grouping).

```ts
const table = useDataTable<Sale>({
  data: sales,
  columns: defineColumns<Sale>([
    { id: "region" },
    { id: "team" },
    { id: "amount", aggregate: "sum" },
  ]),
  initialState: { grouping: ["region", "team"] },
});

table.groupBy(["region"]);
table.collapseAllGroups();
table.expandAllGroups();
```

The pipeline is filter → sort → group → paginate. A group follows its column's sort rule when
present, otherwise first appearance; leaves retain the table's ordering inside each group. Custom
buckets use natural number/text ordering in the table locale, separate from raw-cell comparators.
Empty group labels stay last in either sort direction, matching the leaf sort's empty-last rule.
Hidden columns can still group or aggregate. Unknown and `groupable: false` ids are ignored
with issues. A `groupValue(value, row)` callback can bucket dates by month or numbers by range.
Buckets are strings or finite numbers; `1`, `"1"` and `"__proto__"` remain safe, distinct values.
Other raw values default to their formatted text. A throwing/invalid bucket uses an empty label
and reports an issue.

## Render groups separately

`renderItems` now contains `row`, `detail` and `group` items. Narrow the kind before accessing
`row` or `rowIndex`. A group exposes `key`, `columnId`, `value`, `depth`, `leafCount`,
`isExpanded`, `selection`, `getAggregate(id)` and `getAggregateDisplay(id)`. Group headers are
read-only and have no grid position.

```vue
<template v-for="item in table.renderItems" :key="item.key">
  <tr v-if="item.kind === 'group'">
    <th>
      <button :aria-expanded="item.isExpanded" @click="table.toggleGroup(item.key)">
        {{ item.value }} ({{ item.leafCount }})
      </button>
    </th>
    <td>{{ item.getAggregateDisplay("amount") }}</td>
  </tr>
  <tr v-else-if="item.kind === 'row'">
    <td>{{ item.row.getDisplay("region") }}</td>
    <td>{{ item.row.getDisplay("amount") }}</td>
  </tr>
</template>
```

`rows` contains visible data leaves on the current page. Their `depth` is the number of grouping
levels. `processedRows` contains all filtered leaves in group order, including collapsed groups.
Use `getGroup(key)` for a group on any page, and `getRow(rowKey)` for an actual data row.
`grouped` says whether grouping is effective. Row/detail expansion stays in `expanded`;
group expansion stays in `expandedGroups` (default `true`). New groups open automatically with
`true`; when using an explicit key array, new keys start collapsed.

## Aggregates

Set `aggregate` on each value column:

| Aggregate        | Result                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `sum`            | Sum of finite numeric cells, zero when empty                       |
| `count`          | Number of filtered leaves, including empty cells                   |
| `min`, `max`     | Smallest/largest finite number; empty without numbers              |
| `mean`, `median` | Arithmetic mean or median of finite numbers; empty without numbers |
| `unique`         | Frozen array of distinct raw values in leaf order                  |
| Function         | `(values, rows) => unknown`, both arrays readonly                  |

Numeric aggregates do not coerce strings to numbers. Add `formatAggregate(value, rows)` for
currency or other subtotal text. Aggregate and formatter failures yield an empty cell and an
`aggregate_error` issue. Values come from `row.getValue(id)`, including computed columns.
Aggregates include all filtered descendants, regardless of page or expansion.

Do not average ratios when a subtotal needs a ratio of totals. For example:

```ts
{
  id: "variancePct",
  accessor: (row: CostLine) => (row.actual - row.budget) / row.budget,
  aggregate: (_values, rows) => {
    const budget = rows.reduce((sum, row) => sum + row.budget, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return budget === 0 ? 0 : (actual - budget) / budget;
  },
  formatAggregate: value => `${(Number(value) * 100).toFixed(1)}%`,
}
```

## Pagination, selection and edits

By default, one pagination unit is a **top-level group**, with its visible descendants. A
collapsed root still occupies one unit. `paginateBy: 'row'` counts visible group headers and
data leaves instead; details do not consume a slot, and a page can begin within a group.
`rowCount` and page ranges use that unit; `loadedRowCount` and `totalRowCount` count source
leaves. Disable pagination with `paginate: false` while retaining collapse behavior.

`toggleGroupSelection(key, selected?)` toggles all filtered leaves of a group, including hidden
descendants, while respecting `selectionMode`. Coverage is `none`, `some` or `all`. Ordinary
page selection operates on visible data leaves. Edits and drafts keep their row key when an
edited grouping value moves the row to another group; group headers themselves cannot be edited.

Streaming append, upsert and removal reuse bucket values for unchanged rows and aggregate results
for unaffected group paths. Membership/order scanning still scales with the input; expansion,
selection, column widths and pagination do not rerun bucket or aggregate callbacks. See the
[benchmark](/benchmarks/grouping).

## Export and compatibility

`exportRows()` exports filtered leaves as before. `exportRows({groups: true})` inserts group
records containing their labels and aggregate cells. It exports the full filtered hierarchy even
when collapsed; add `pageOnly: true` to export just visible page items. `columns`, `depth`,
`indent`, CSV/TSV selection and formula escaping also apply to grouped exports.

Trees ignore grouping and report `grouping_with_tree`. Manual tables forward grouping/expansion
state to the server and do not group or aggregate a partial server page.

**Migration for the next beta:** complete `TableState` literals must add `grouping: []` and
`expandedGroups: true`. Partial state patches need no change. Custom renderers must handle the
new `kind: 'group'` union member before accessing a data row. See
[ADR 0025](/adr/0025-row-grouping-and-aggregation).
