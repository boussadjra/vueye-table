---
aside: false
---

<script setup lang="ts">
import CrmContacts from "../.vitepress/theme/examples/crm-contacts/CrmContacts.vue";
</script>

# CRM contacts

A sales team's directory of 120 contacts, built without `<VueyeTable>`. One `useDataTable` holds
the search, filters, sort, page, and selection; headless components and our own markup draw it as
a table or as a card grid. Switch views mid-search and nothing resets, because rendering is the
only thing that changes.

<DemoFrame title="CrmContacts.vue">
  <CrmContacts />
</DemoFrame>

## How it works

### One table, provided once

`useDataTable` returns a reactive binding over the engine. `provideDataTable` hands it to every
headless control below, so the search box, pagination, status line, and both views share it
without props.

```ts
const contacts = shallowRef<readonly Contact[]>(makeContacts(120));

const table = useDataTable<Contact>({
  data: contacts,
  columns: contactColumns,
  rowKey: "id",
  initialState: {
    sorting: [{ column: "lastContacted", direction: "desc" }],
    pagination: { page: 1, pageSize: 12 },
  },
});
provideDataTable(table);
```

### Two renderers over the same rows

The table view is plain `<table>` markup around `DataTableRoot`, `DataTableHeaderCell`,
`DataTableSortButton`, `DataTableRow`, and `DataTableCell`, which add `aria-sort`,
`aria-selected`, and row indexes. The cards view is a `<ul>` over the very same `table.rows`.
Both use `DataTableSelectRow`, so a selection made in one view is still there in the other.

```vue
<!-- ContactsTable.vue -->
<DataTableRow v-for="row in table.rows" :key="row.key" :row="row">
  <td><DataTableSelectRow :row="row" :label="`Select ${row.original.name}`" /></td>
  <DataTableCell v-for="column in table.columns" :key="column.id" :row="row" :column="column">
    <template #default="{ display }">
      <StagePill v-if="column.id === 'stage'" :stage="row.original.stage" />
      <!-- … one branch per column … -->
      <template v-else>{{ display }}</template>
    </template>
  </DataTableCell>
</DataTableRow>

<!-- ContactCards.vue -->
<li
  v-for="row in table.rows"
  :key="row.key"
  :data-selected="table.isSelected(row.key) ? '' : undefined"
>
  <DataTableSelectRow :row="row" :label="`Select ${row.original.name}`" />
  …
</li>
```

### Filters are column filter values

Every filter is `table.filter(columnId, value)`, so it lives in `table.state.filters` as plain
data. An array is the default one-of match, which covers the owner chips and the stage control.
Tags need the opposite, a row that has _every_ selected tag, so that column brings its own
`filter`.

```ts
{
  id: "tags",
  sortable: false,
  filter: (tags, selected) =>
    !Array.isArray(selected) || selected.every((tag: string) => tags.includes(tag)),
},
```

```ts
table.filter("owner", ["maya", "theo"]); // owned by Maya or Theo
table.filter("stage", ["customer"]); // exactly one stage
table.filter("favorite", true); // identical to true
table.filter("tags", ["Champion", "EMEA"]); // both tags
```

### A sort menu is just a select

The table view sorts from its headers; the cards view has no headers, so a `<select>` reads the
first rule of `table.state.sorting` and writes with `table.sort`. Each column's `compare` decides
the order: stages follow the funnel, not the alphabet.

```ts
const sortValue = computed(() => {
  const rule = table.state.sorting[0];
  return rule ? `${rule.column}:${rule.direction}` : "none";
});

function onSortChange(event: Event): void {
  const [column = "", direction] = (event.target as HTMLSelectElement).value.split(":");
  table.sort(column, direction as SortDirection);
}
```

### Edits replace the data

Starring a contact, or assigning the selection to an owner from the floating bar, builds a new
array and assigns it to the ref. The table follows the ref and keeps its state, so the page,
filters, and selection survive the change.

```ts
function updateContacts(keys: ReadonlySet<string>, change: (contact: Contact) => Contact): void {
  contacts.value = contacts.value.map((contact) =>
    keys.has(contact.id) ? change(contact) : contact,
  );
}

function assignSelected(ownerId: string): void {
  const keys = new Set(table.getSelectedRows().map((row) => row.original.id));
  updateContacts(keys, (contact) => ({ ...contact, owner: ownerId }));
}
```

### Deterministic cells

"Last contacted" is a `YYYY-MM-DD` string measured against a fixed reference day, not the clock,
so the server render and the browser agree. The column's `format` gives search and export the
same text the cell shows, and its `compare` orders the ISO days as text.

```ts
{
  id: "lastContacted",
  searchable: false,
  format: (day) => relativeDay(day), // "3 days ago", measured from 2026-09-30
  compare: (left, right) => (left < right ? -1 : left > right ? 1 : 0),
},
```

## Related

- [Columns](/guide/columns): `format`, `compare`, and custom `filter` functions.
- [State](/guide/state): the plain data behind search, filters, sort, and selection.
- [Components](/guide/components): every headless component and its slots.
- [Layers](/guide/layers): when to drop from `<VueyeTable>` to headless pieces or `useDataTable`.
- [Theming](/guide/theming): styling your own markup next to the styled layer.
