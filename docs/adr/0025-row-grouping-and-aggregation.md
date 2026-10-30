# 0025 — Row grouping and aggregation

Status: accepted for the next beta.

## Context

The financial report currently composes groups over `processedRows`. Group expansion, selection,
pagination, editing and streaming need one shared model. This extends that earlier composition-only
decision; ADR 0011's exclusion of aggregation from **trees** still applies.

## Decision

Flat client tables gain a memoized filter → sort → group → paginate stage. `grouping` is an ordered
array of column ids; `expandedGroups` is a separate array of namespaced string keys or `true`.
Operations are `groupBy`, `toggleGroup`, `expandAllGroups`, `collapseAllGroups` and
`toggleGroupSelection`. Grouping changes return to page one. Expansion changes preserve the page.

Groups use nested `Map`s, and keys encode `['group', columnId, value, ...]` from outer to inner.
Numbers and strings remain distinct. The default bucket keeps strings and finite numbers and
formats other values as text. `groupValue` can choose a string or finite number instead. Failed
or invalid buckets use an empty label and report a `TableIssue`.

`TableRenderItem` gains a discriminated `kind: 'group'` member, `TableGroup`. It has no `row` or
`rowIndex`. It carries its key, column id, bucket value, depth, leaf count, expansion, selection
coverage and aggregate accessors. Visible leaves alone populate `rows` and grid coordinates.
`processedRows` retains **every filtered leaf**, in group display order, even under collapsed groups.
`getGroup` includes groups hidden by expansion or pagination; `getRow` always uses data row keys.

Groups follow their column's sort direction, otherwise first appearance. Default buckets use the
column comparator on representative raw values; custom buckets use natural number/text ordering
in the table locale, so a date comparator never receives a month string.
Empty group labels stay last in both sort directions.
Leaf ordering comes from the sort stage. Aggregates read cached column values over the group's
filtered leaves, including nested and off-page leaves. Numeric aggregates ignore missing,
non-numeric and non-finite values. `sum` of no numbers is zero; other numeric aggregates are empty.
`count` counts leaves; `unique` returns a frozen array of distinct raw values in leaf order.
Custom aggregates receive readonly values and original rows. Aggregate/formatter failures produce
an empty cell and an issue. A ratio of totals requires a custom aggregate, not `mean` of row ratios.

Pagination defaults to top-level groups, including collapsed groups. `paginateBy: 'row'` instead
counts visible group headers and leaf items; detail items never consume a page slot. A row-mode
page can begin inside a group, as with tree row pagination. `rowCount`, page range and page size
use the selected pagination unit; `totalRowCount` and `loadedRowCount` continue to count source
leaves. `paginate: false` keeps all visible groups and leaves on one page.

Group selection covers filtered leaves, including collapsed descendants. Single/none selection
modes keep their existing rules. Row drafts, selection and editing stay keyed by data row identity;
editing a grouping value moves its leaf. Trees ignore grouping with `grouping_with_tree`. Manual
tables forward the state but never calculate aggregates from a server page.

The grouping stage caches buckets by row key and original-row identity. It reuses aggregates for
unchanged ordered leaf membership and retains unchanged nodes. Ingestion scans the new filtered,
sorted membership; only changed leaves run bucketing callbacks and only affected group paths run
aggregate callbacks. This is not a constant-time ingestion claim. Expansion and pagination reuse
the model and visit visible entries without regrouping or recalculating aggregates. Benchmarks
record both initial grouping and cached expansion separately.

`exportRows({groups: true})` writes group labels with aggregate cells on group-header records.
Default grouped export includes the whole filtered hierarchy, regardless of collapse; `pageOnly`
uses the visible page. Formula escaping applies to labels and formatted aggregates. Default
leaf-only exports remain unchanged in content.

## Migration and scope

Complete `TableState` literals add `grouping: []` and `expandedGroups: true`; partial patches remain
compatible. Renderers and exhaustive switches must handle `kind: 'group'` **before** reading `row`
or `rowIndex`. `RowItemKind` includes `group`; `getRowItemKey` still takes data/detail kinds only.
Core and the composable expose the model and operations. The runnable example supplies its own
body. Built-in grouped component rendering remains the follow-up in #139–#141; current built-in
bodies skip group headers rather than treating them as data or details.
