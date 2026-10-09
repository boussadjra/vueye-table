# Tree data

Core accepts nested children or a flat array with parent keys. It indexes the hierarchy once, filters it, sorts siblings, flattens open branches, then paginates. Vue bindings expose the same rows and operations.

```ts
interface Entry {
  id: string;
  name: string;
  children?: readonly Entry[];
}
const table = useDataTable<Entry>({
  data: entries,
  columns: [{ id: "name", editable: true }],
  getChildren: (row) => row.children,
  setChildren: (row, children) => ({ ...row, children }),
});
table.toggleExpanded("design");
```

`setChildren` is the immutable counterpart of `getChildren`. A child edit copies the path to its root, retains untouched siblings and calls `onDataChange` with the new root array. Without a setter, nested descendant edits report `read_only_cell`. Root edits and adjacency edits need no child setter. Undo and redo address rows by key, including collapsed children.

For adjacency data, use `getParentKey: row => row.parentId` instead of `getChildren`. A null or undefined parent is a root. String and numeric keys remain distinct. Supply globally unique, stable keys, especially for lazy children; index fallback keys depend on traversal order.

## Rows and expansion

Every row exposes `depth`, `parentKey`, `childCount`, `childStatus`, `selection`, `canExpand` and `isExpanded`. Unloaded children have an undefined count and an `idle`, `loading` or `error` status. Loaded leaves have count zero and status `loaded`.

`toggleExpanded`, `expandAll`, `collapseAll` and `state.expanded` drive branch disclosure. `true` includes subsequently loaded children. Tree branches create child data rows in `renderItems`; they do not create detail items by themselves. `getRowCanExpand` still opts a row into a separately rendered detail. Child rows count as data rows for grid coordinates, editing and selection.

Use the [project-files example](/examples/tree-data) for a custom renderer, or the
[hierarchy components example](/examples/hierarchy-components) for full table/grid controls.

## Tree components

Pass `get-children` (nested data) or `get-parent-key` (adjacency data) to either full component.
Use `tree-column="name"` to choose the disclosure/indentation column; the first visible column is
the fallback. Tree callbacks and `expand-mode` are creation options. `v-model:expanded`,
`expand` / `collapse` and optional `expanded` content work as in the [expansion guide](/guide/expansion).
With a tree, an expanded slot adds detail content alongside child rows; use `row-can-expand` to
limit which rows receive that extra content.

```vue
<VueyeTable
  :data="entries"
  :columns="[{ id: 'name' }]"
  :get-children="(entry) => entry.children"
  :set-children="(entry, children) => ({ ...entry, children })"
  tree-column="name"
  selectable
/>
```

Headless roots and styled `VtTable` / `VtGrid` accept `tree-column`; cells automatically wrap that
column in `DataTableTreeCell` / `VtTreeCell`. Custom cells can use these wrappers directly and
set `:tree="false"` on the headless cell to prevent double wrapping. Indentation uses logical
inline spacing, including RTL. Set `--vt-tree-indent` to change its step (default `1.25rem`).
Tri-state row checkboxes reflect loaded descendants. Lazy branches show loading text or an inline
**Retry children** button; include `DataTableStatus` / `VtStatus` when composing layers so its polite
region announces progress and failures. Full components include this status automatically.

Configured tree roots expose `role="treegrid"` even when empty. Rows expose `aria-level`,
`aria-expanded` for branches, `aria-setsize`, `aria-posinset`, and logical `aria-rowindex` across
virtual slices. In a table, focus a row and use Right to open it or enter its first child; Left
closes it or returns to its parent. Up/Down and Home/End move through visible rows and keep focus
on the destination when virtualization replaces the rendered window; `*` opens
siblings. In a grid these tree commands apply in the designated tree column. Other columns,
Shift+arrows and Ctrl/Meta+arrows retain spreadsheet movement and selection. Editors and ordinary
embedded form controls keep their keys. This follows the tree-column interaction variant of the
[WAI-ARIA treegrid guidance](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/).

For composable-only grids, use `useDataGrid(table, { treeColumn: () => 'name' })`; omission uses the
first visible column. `table.tree` identifies a configured hierarchy. Pure core renderers can call
`gridCommand(event, { canExpand: row.canExpand, expanded: row.isExpanded })` and execute its tree action.

`expandMode: 'single'` retains one saved key. Its ancestor path opens with it, so opening a nested branch keeps that branch reachable. Opening a branch elsewhere closes the previous path. Closing a derived ancestor closes the saved branch.

## Search, sorting and pages

`treeFilter` defaults to `ancestors`: matching rows keep their ancestor path. Those ancestors open while search or column filters are active, without changing saved expansion state. Clearing the query restores the saved disclosure state.

- `descendants` also includes and opens all loaded descendants of a matching parent, while preserving ancestor paths.
- `strict` shows only matching loaded leaves as a result list, retaining their original depth and parent key. Without an active query, it behaves like the ordinary tree.

Change `treeFilter` on a mounted `VueyeTable` or `VueyeGrid` to update the current search context.
Loaded branches, saved expansion, selection and pending edits are retained. `useDataTable`
accepts a ref or getter for this option; core callers use `table.setTreeFilter(mode)`.
Passing `undefined` restores `ancestors`. The [runnable tree example](/examples/tree-data)
includes a Search context selector.

```ts
import { ref } from "vue";
import { useDataTable, type TreeFilter } from "vueye-table";

const context = ref<TreeFilter>("ancestors");
const table = useDataTable({ data, columns, getChildren, treeFilter: context });
context.value = "strict";
```

Sorting applies independently within each sibling group. Parents always precede their visible descendants; ties preserve source order.

`paginateBy` defaults to `root`: a root and all its visible descendants stay together. `rowCount`, `totalRowCount`, page positions and page size count roots. `rows.length` counts the visible data rows on that page and can exceed page size. Strict-filter results count matching leaves as their page units. Set `paginateBy: 'row'` to paginate the flattened visible sequence instead; its filtered count changes when branches open. `paginate: false` exposes every visible row.

For `manual: true`, the server owns filtering, sibling order and root pagination. Supply one server page of roots; `rowCount` counts roots across server pages. Client disclosure and per-node lazy loading still apply.

## Selection and export

In multiple selection mode, selecting or deselecting a parent includes all its loaded descendants, even when collapsed or filtered out. `row.selection` reports coverage of the row and its loaded subtree: `none`, `some` or `all`. `selectedCount` counts existing selected data rows. Single selection selects one key. External state writes preserve the exact supplied selection; operations perform the cascade.

Children loaded under a selected parent become selected on arrival. Unknown selection keys remain in state but do not contribute to the tree's count.

Export uses the visible flattened sequence across pages, or the current page with `pageOnly`. Collapsed descendants and detail items are excluded.

```ts
table.exportRows({ depth: true, indent: "  ", format: "csv" });
```

`depth` prepends a numeric **Depth** column. `indent` prefixes the first data column once per level. Formula escaping still defaults to true.

## Lazy children and cancellation

Vue supplies a native cancellation controller automatically, and the inferred `AbortSignal` can go directly into `fetch`. Core retains its injected controller contract and has no DOM type dependency.

```ts
const table = useDataTable<Entry>({
  data: roots,
  columns: [{ id: "name" }],
  getChildren: (row) => row.children,
  hasChildren: (row) => row.children === undefined,
  loadChildren: async (row, signal) => {
    const response = await fetch(`/api/entries/${encodeURIComponent(row.key)}`, { signal });
    if (!response.ok) throw new Error(`Children request failed (${response.status})`);
    return response.json() as Promise<readonly Entry[]>;
  },
});
```

Validate remote response data at your application boundary. `hasChildren` should identify only genuinely unloaded branches. An explicit empty child array is a loaded leaf.

Opening an unloaded branch starts one request. Repeated opens share the in-flight request. Closing the branch or an ancestor, replacing data, or destroying the table aborts its controller; stale completions are ignored. Vue scope disposal calls `destroy`. A rejected load reports `tree_load_error`, keeps the branch usable and never throws from `toggleExpanded`. Close and reopen to retry. With core `createTable`, a missing controller factory reports `invalid_tree_option`. Custom Vue signal types use `useDataTable<Entry, CustomSignal>` with a matching `createChildLoadController` factory.

Successful children are cached by parent key until a different array reaches `setData`. Loading alone does not call `onDataChange`: the cache belongs to the table. Editing a loaded nested child with `setChildren` materializes the copied hierarchy in the callback data. Lazy adjacency children live in the table cache; a child edit updates that cache and invokes the callback with a new source array. Persist adjacency child edits using the supplied `CellChange` records. Replacing data clears the cache and undo stack.

## Recovery and large trees

Missing parents recover as roots with `tree_orphan`. Cycles, self-parent links and repeated nested objects recover with `tree_cycle`; a repeated object is never traversed twice. Duplicate source keys receive unique recovery keys. Loaded batches colliding with existing keys are rejected with `tree_duplicate_key` and never overwrite existing rows.

Traversal is iterative. `maxDepth` defaults to 1,000 edges; deeper rows recover as roots with `tree_depth_exceeded`. Increase it explicitly for a known deep hierarchy. Both input formats, and loaded children, use these checks. Recovered nested roots without an unambiguous source path refuse edits with `read_only_cell`.

The hierarchy, filter and sibling-sort stages are cached separately from expansion. A single toggle inserts or removes its visible subtree; snapshot projection costs the visible sequence. Collapsed descendants are not traversed again. [Virtual rows](/guide/virtualization) consume the same flattened render items, retaining keyed measurements and scroll anchors across toggles.

Run `pnpm bench:tree` for build, filter, sibling sort, expand-all/collapse and single-toggle benchmarks at 10,000 and 100,000 nodes with three or ten levels. Results are saved under `test-results/tree-bench.json`. These measurements describe this implementation; they do not establish production readiness.

Try [lazy file explorer](/examples/file-explorer) for full-table loading and supplied size totals,
or [department allocations](/examples/budget-tree) for adjacency editing, tri-state selection
and virtual rows. [Performance](/guide/performance) compares eager, lazy and virtual costs;
[validation](/guide/validation) covers persistence. See [expansion](/guide/expansion) for
master-detail content and [orders](/examples/orders-dashboard) for inline line items.
