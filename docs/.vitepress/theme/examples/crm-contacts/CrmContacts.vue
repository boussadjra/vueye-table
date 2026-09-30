<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import {
  DataTableColumnVisibility,
  DataTableEmpty,
  DataTablePageSize,
  DataTablePagination,
  DataTableSearch,
  DataTableStatus,
  provideDataTable,
  useDataTable,
  type SortDirection,
} from "vueye-table";

import { contactColumns } from "./columns";
import ContactCards from "./ContactCards.vue";
import ContactsTable from "./ContactsTable.vue";
import CrmAvatar from "./CrmAvatar.vue";
import CrmIcon from "./CrmIcon.vue";
import CrmPopover from "./CrmPopover.vue";
import {
  OWNERS,
  STAGES,
  TAGS,
  formatCompactMoney,
  daysSince,
  makeContacts,
  ownerName,
  stageLabel,
  type Contact,
  type Stage,
} from "./data";

/* ---- Data: owned here, replaced immutably, handed to the table as a ref. ---- */

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
// Every headless control below, and both views, read this one table.
provideDataTable(table);

/* ---- View: rendering only. Switching keeps search, filters, sort, page, and selection. ---- */

type View = "table" | "cards";
const view = ref<View>("table");

/* ---- Filters: each one is a column filter value in `table.state.filters`. ---- */

function listFilter(columnId: string): readonly string[] {
  const value = table.state.filters[columnId];
  return Array.isArray(value) ? (value as string[]) : [];
}

const stageFilter = computed(() => listFilter("stage")[0] as Stage | undefined);
const ownerFilter = computed(() => listFilter("owner"));
const tagFilter = computed(() => listFilter("tags"));
const favoritesOnly = computed(() => table.state.filters["favorite"] === true);

function setStage(stage: Stage | undefined): void {
  // An array is the default one-of match, so "lead" never matches a stage merely containing it.
  table.filter("stage", stage ? [stage] : undefined);
}

function toggleIn(list: readonly string[], item: string): string[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

function toggleOwner(id: string): void {
  table.filter("owner", toggleIn(ownerFilter.value, id));
}

function toggleTag(tag: string): void {
  table.filter("tags", toggleIn(tagFilter.value, tag));
}

function toggleFavoritesOnly(): void {
  table.filter("favorite", favoritesOnly.value ? undefined : true);
}

function clearAll(): void {
  table.clearFilters();
  table.search("");
}

const activeFilters = computed(() => {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (stageFilter.value) {
    chips.push({
      key: "stage",
      label: `Stage is ${stageLabel(stageFilter.value)}`,
      remove: () => setStage(undefined),
    });
  }
  for (const id of ownerFilter.value) {
    chips.push({
      key: `owner-${id}`,
      label: `Owner is ${ownerName(id)}`,
      remove: () => toggleOwner(id),
    });
  }
  for (const tag of tagFilter.value) {
    chips.push({ key: `tag-${tag}`, label: `Tagged ${tag}`, remove: () => toggleTag(tag) });
  }
  if (favoritesOnly.value) {
    chips.push({ key: "favorite", label: "Favorites", remove: toggleFavoritesOnly });
  }
  if (table.state.search.trim() !== "") {
    chips.push({
      key: "search",
      label: `“${table.state.search.trim()}”`,
      remove: () => table.search(""),
    });
  }
  return chips;
});

/* ---- Sort menu for the cards view: a select bound to `table.state.sorting`. ---- */

const SORT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "lastContacted:desc", label: "Recently contacted" },
  { value: "lastContacted:asc", label: "Longest since contact" },
  { value: "dealValue:desc", label: "Deal value, high to low" },
  { value: "dealValue:asc", label: "Deal value, low to high" },
  { value: "name:asc", label: "Name, A to Z" },
  { value: "name:desc", label: "Name, Z to A" },
  { value: "company:asc", label: "Company, A to Z" },
  { value: "stage:asc", label: "Lifecycle stage" },
];

const sortValue = computed(() => {
  const rule = table.state.sorting[0];
  return rule ? `${rule.column}:${rule.direction}` : "none";
});

// A sort chosen in the table view that the menu does not list still shows as the current choice.
const sortOptions = computed(() => {
  const known = SORT_OPTIONS.some((option) => option.value === sortValue.value);
  if (known || sortValue.value === "none") {
    return SORT_OPTIONS;
  }
  const [column = "", direction] = sortValue.value.split(":");
  const header = table.getColumn(column)?.header ?? column;
  return [
    ...SORT_OPTIONS,
    {
      value: sortValue.value,
      label: `${header}, ${direction === "asc" ? "ascending" : "descending"}`,
    },
  ];
});

function onSortChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "none") {
    table.clearSorting();
    return;
  }
  const [column = "", direction] = value.split(":");
  table.sort(column, direction as SortDirection);
}

/* ---- Summary of the rows that pass the search and filters, across every page. ---- */

const summary = computed(() => {
  let pipeline = 0;
  let followUp = 0;
  for (const row of table.processedRows) {
    const contact = row.original;
    const open = contact.stage !== "customer" && contact.stage !== "churned";
    if (open) {
      pipeline += contact.dealValue;
      if (daysSince(contact.lastContacted) > 30) {
        followUp += 1;
      }
    }
  }
  return { pipeline: formatCompactMoney(pipeline), followUp };
});

/* ---- Edits: new arrays, never mutation. The table follows the ref. ---- */

const announcement = ref("");
let announcementTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(announcementTimer));

function announce(message: string): void {
  announcement.value = message;
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => (announcement.value = ""), 2800);
}

function updateContacts(keys: ReadonlySet<string>, change: (contact: Contact) => Contact): void {
  contacts.value = contacts.value.map((contact) =>
    keys.has(contact.id) ? change(contact) : contact,
  );
}

function toggleFavorite(id: string): void {
  updateContacts(new Set([id]), (contact) => ({ ...contact, favorite: !contact.favorite }));
}

function selectedIds(): Set<string> {
  return new Set(table.getSelectedRows().map((row) => row.original.id));
}

function plural(count: number): string {
  return `${count} contact${count === 1 ? "" : "s"}`;
}

function assignSelected(ownerId: string, close: () => void): void {
  const keys = selectedIds();
  updateContacts(keys, (contact) => ({ ...contact, owner: ownerId }));
  close();
  announce(`Assigned ${plural(keys.size)} to ${ownerName(ownerId)}`);
}

function favoriteSelected(): void {
  const keys = selectedIds();
  updateContacts(keys, (contact) => ({ ...contact, favorite: true }));
  announce(`Added ${plural(keys.size)} to favorites`);
}

function selectAllMatching(): void {
  table.select(table.processedRows.map((row) => row.key));
}
</script>

<template>
  <div class="crm">
    <header class="crm-head">
      <div class="title">
        <h2>
          Contacts <span class="total">{{ table.totalRowCount }}</span>
        </h2>
        <p class="meta">
          <span
            ><strong>{{ table.rowCount }}</strong> matching</span
          >
          <span
            ><strong>{{ summary.pipeline }}</strong> open pipeline</span
          >
          <span
            ><strong>{{ summary.followUp }}</strong> need a follow-up</span
          >
        </p>
      </div>
      <div class="view-switch" role="group" aria-label="View">
        <button type="button" :aria-pressed="view === 'table'" @click="view = 'table'">
          <CrmIcon name="table" />Table
        </button>
        <button type="button" :aria-pressed="view === 'cards'" @click="view = 'cards'">
          <CrmIcon name="cards" />Cards
        </button>
        <span class="thumb" :data-view="view" aria-hidden="true" />
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <CrmIcon name="search" />
        <DataTableSearch label="Search contacts" placeholder="Search name, company, email, tag…" />
      </label>

      <button
        type="button"
        class="control"
        :aria-pressed="favoritesOnly"
        @click="toggleFavoritesOnly"
      >
        <CrmIcon name="star" :filled="favoritesOnly" class="star-icon" />Favorites
      </button>

      <CrmPopover
        :label="tagFilter.length ? `Tags, ${tagFilter.length} selected` : 'Tags'"
        align="start"
      >
        <template #trigger>
          <CrmIcon name="tag" />Tags
          <span v-if="tagFilter.length" class="badge">{{ tagFilter.length }}</span>
          <CrmIcon name="chevron" :size="14" />
        </template>
        <template #default>
          <fieldset class="menu">
            <legend>Has every tag</legend>
            <label v-for="tag in TAGS" :key="tag" class="menu-check">
              <input type="checkbox" :checked="tagFilter.includes(tag)" @change="toggleTag(tag)" />
              <span>{{ tag }}</span>
            </label>
          </fieldset>
        </template>
      </CrmPopover>

      <label v-if="view === 'cards'" class="control sort">
        <CrmIcon name="sort" />
        <span class="sr-only">Sort contacts by</span>
        <select :value="sortValue" @change="onSortChange">
          <option value="none">Original order</option>
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <CrmIcon name="chevron" :size="14" />
      </label>

      <CrmPopover v-else label="Columns" align="end" class="columns-popover">
        <template #trigger>
          <CrmIcon name="columns" />Columns<CrmIcon name="chevron" :size="14" />
        </template>
        <template #default>
          <DataTableColumnVisibility as="div" class="menu">
            <template #default="{ columns, toggle }">
              <p class="menu-title">Shown columns</p>
              <label v-for="{ column, visible } in columns" :key="column.id" class="menu-check">
                <input
                  type="checkbox"
                  :checked="visible"
                  :disabled="column.id === 'name'"
                  @change="toggle(column.id)"
                />
                <span>{{ column.header }}</span>
              </label>
            </template>
          </DataTableColumnVisibility>
        </template>
      </CrmPopover>
    </div>

    <div class="filters">
      <div class="segmented" role="group" aria-label="Lifecycle stage">
        <button type="button" :aria-pressed="!stageFilter" @click="setStage(undefined)">All</button>
        <button
          v-for="stage in STAGES"
          :key="stage.id"
          type="button"
          :data-stage="stage.id"
          :aria-pressed="stageFilter === stage.id"
          @click="setStage(stage.id)"
        >
          <i aria-hidden="true" />{{ stage.label }}
        </button>
      </div>

      <div class="owners" role="group" aria-label="Owner">
        <span class="owners-label" aria-hidden="true">Owner</span>
        <button
          v-for="owner in OWNERS"
          :key="owner.id"
          type="button"
          class="owner-chip"
          :aria-pressed="ownerFilter.includes(owner.id)"
          :aria-label="owner.name"
          :title="owner.name"
          @click="toggleOwner(owner.id)"
        >
          <CrmAvatar :name="owner.name" :size="24" />
          <span class="owner-first">{{ owner.first }}</span>
        </button>
      </div>
    </div>

    <TransitionGroup
      v-if="activeFilters.length > 0"
      tag="ul"
      name="chip"
      class="active"
      aria-label="Active filters"
    >
      <li v-for="chip in activeFilters" :key="chip.key">
        <button
          type="button"
          class="active-chip"
          :aria-label="`Remove filter: ${chip.label}`"
          @click="chip.remove"
        >
          {{ chip.label }}<CrmIcon name="close" :size="13" />
        </button>
      </li>
      <li key="clear">
        <button type="button" class="clear-all" @click="clearAll">Clear all</button>
      </li>
    </TransitionGroup>

    <div class="stage" :data-view="view">
      <template v-if="table.rowCount > 0">
        <ContactsTable v-if="view === 'table'" @favorite="toggleFavorite" />
        <ContactCards v-else @favorite="toggleFavorite" />
      </template>
      <DataTableEmpty class="empty">
        <span class="empty-icon"><CrmIcon name="filterOff" :size="22" /></span>
        <strong>No contacts match</strong>
        <span>Try another search, or loosen the stage, owner, and tag filters.</span>
        <button type="button" class="control" @click="clearAll">Clear filters</button>
      </DataTableEmpty>
    </div>

    <footer class="crm-foot">
      <DataTableStatus class="status">
        <template #default="{ start, end, rowCount, totalRowCount }">
          <template v-if="rowCount > 0">
            <strong>{{ start }}–{{ end }}</strong> of {{ rowCount }} contacts<template
              v-if="rowCount < totalRowCount"
            >
              · filtered from {{ totalRowCount }}</template
            >
          </template>
          <template v-else>No contacts</template>
        </template>
      </DataTableStatus>

      <label class="page-size">
        Per page
        <DataTablePageSize :options="[12, 24, 48]" label="Contacts per page" />
      </label>

      <DataTablePagination class="pager" label="Contact pages">
        <template #default="{ items, canPrevious, canNext, previous, next, goToPage }">
          <button
            type="button"
            aria-label="Previous page"
            :disabled="!canPrevious"
            @click="previous"
          >
            <CrmIcon name="left" />
          </button>
          <template v-for="item in items" :key="item.type === 'gap' ? item.key : item.page">
            <span v-if="item.type === 'gap'" class="gap" aria-hidden="true">…</span>
            <button
              v-else
              type="button"
              :aria-label="`Page ${item.page}`"
              :aria-current="item.current ? 'page' : undefined"
              @click="goToPage(item.page)"
            >
              {{ item.page }}
            </button>
          </template>
          <button type="button" aria-label="Next page" :disabled="!canNext" @click="next">
            <CrmIcon name="right" />
          </button>
        </template>
      </DataTablePagination>
    </footer>

    <div class="floating">
      <Transition name="toast">
        <p v-if="announcement" class="toast" role="status">
          <CrmIcon name="check" :size="14" />{{ announcement }}
        </p>
      </Transition>
      <Transition name="bar">
        <div
          v-if="table.selectedCount > 0"
          class="action-bar"
          role="toolbar"
          aria-label="Selected contacts"
        >
          <span class="selected">
            <span class="selected-count">{{ table.selectedCount }}</span>
            selected
          </span>
          <button
            v-if="table.allSelection !== 'all' && table.rowCount > 0"
            type="button"
            class="bar-link"
            @click="selectAllMatching"
          >
            Select all {{ table.rowCount }}
          </button>
          <span class="bar-divider" aria-hidden="true" />
          <CrmPopover label="Assign to…" placement="above" align="start" class="bar-popover">
            <template #trigger><CrmIcon name="user" />Assign to…</template>
            <template #default="{ close }">
              <div class="menu" role="group" aria-label="Owners">
                <p class="menu-title">Assign {{ plural(table.selectedCount) }} to</p>
                <button
                  v-for="owner in OWNERS"
                  :key="owner.id"
                  type="button"
                  class="menu-item"
                  @click="assignSelected(owner.id, close)"
                >
                  <CrmAvatar :name="owner.name" :size="22" />{{ owner.name }}
                </button>
              </div>
            </template>
          </CrmPopover>
          <button type="button" class="bar-button" @click="favoriteSelected">
            <CrmIcon name="star" />Favorite
          </button>
          <button type="button" class="bar-button bar-clear" @click="table.clearSelection()">
            <CrmIcon name="close" />Clear
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.crm {
  --crm-surface: #ffffff;
  --crm-head: #faf9fd;
  --crm-raised: #ffffff;
  --crm-line: #e6e3ee;
  --crm-line-soft: #efedf5;
  --crm-line-strong: #d3cfe0;
  --crm-text-1: var(--vp-c-text-1);
  --crm-text-2: var(--vp-c-text-2);
  --crm-text-3: var(--vp-c-text-3);
  --crm-control: #ffffff;
  --crm-control-hover: #f4f2f9;
  --crm-chip: #f6f5fa;
  --crm-accent: #8a24c9;
  --crm-accent-text: #8a24c9;
  --crm-focus: #a02de6;
  --crm-row-hover: #faf9fd;
  --crm-row-selected: rgb(160 45 230 / 0.055);
  --crm-star: #d48806;
  --crm-fresh: #18a06f;
  --crm-warm: #d48806;
  --crm-stale: #bdb9cc;
  --crm-stage-lead: #0a74b3;
  --crm-stage-qualified: #8a24c9;
  --crm-stage-proposal: #c2410c;
  --crm-stage-customer: #15803d;
  --crm-stage-churned: #6e6b82;
  --crm-shadow-card: 0 1px 2px rgb(20 10 40 / 0.04), 0 8px 24px -10px rgb(60 20 90 / 0.18);
  --crm-shadow-pop: 0 2px 4px rgb(20 10 40 / 0.06), 0 16px 40px -8px rgb(60 20 90 / 0.22);
  --crm-bar: #16131f;
  --crm-bar-text: #f3f1fa;

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  font-size: 14px;
  color: var(--crm-text-1);
}

.dark .crm {
  --crm-surface: #12111b;
  --crm-head: #15141f;
  --crm-raised: #191824;
  --crm-line: #25233a;
  --crm-line-soft: #1d1b2b;
  --crm-line-strong: #36334d;
  --crm-control: #15141f;
  --crm-control-hover: #1f1d2d;
  --crm-chip: #1b1a28;
  --crm-accent: #b366f5;
  --crm-accent-text: #cf8bff;
  --crm-focus: #bb66f7;
  --crm-row-hover: #171623;
  --crm-row-selected: rgb(160 45 230 / 0.12);
  --crm-star: #f5c542;
  --crm-fresh: #37d399;
  --crm-warm: #f2b34a;
  --crm-stale: #4d4a63;
  --crm-stage-lead: #5cc0ff;
  --crm-stage-qualified: #cf8bff;
  --crm-stage-proposal: #ff9a7a;
  --crm-stage-customer: #4ade80;
  --crm-stage-churned: #a4a1b8;
  --crm-shadow-card: 0 12px 30px -12px rgb(0 0 0 / 0.7);
  --crm-shadow-pop: 0 18px 44px -10px rgb(0 0 0 / 0.75);
  --crm-bar: #231f33;
  --crm-bar-text: #f3f1fa;
}

/* ---- Header ---- */

.crm-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 20px;
}

.title h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 0;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.02em;
  border: 0;
}

.total {
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--crm-text-2);
  font-variant-numeric: tabular-nums;
  background: var(--crm-chip);
  border: 1px solid var(--crm-line);
  border-radius: 999px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--crm-text-3);
}

.meta strong {
  font-weight: 600;
  color: var(--crm-text-1);
  font-variant-numeric: tabular-nums;
}

.view-switch {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  background: var(--crm-chip);
  border: 1px solid var(--crm-line);
  border-radius: 11px;
}

.view-switch button {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 30px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  color: var(--crm-text-3);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 8px;
  transition: color 0.15s;
}

.view-switch button[aria-pressed="true"] {
  color: var(--crm-text-1);
}

.view-switch button:focus-visible {
  outline: 2px solid var(--crm-focus);
}

.thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  background: var(--crm-surface);
  border: 1px solid var(--crm-line);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(20 10 40 / 0.08);
  transition: transform 0.25s var(--vy-ease);
}

.thumb[data-view="cards"] {
  transform: translateX(100%);
}

/* ---- Toolbar ---- */

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search {
  display: flex;
  flex: 1 1 240px;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 11px;
  color: var(--crm-text-3);
  background: var(--crm-control);
  border: 1px solid var(--crm-line);
  border-radius: 9px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.search:focus-within {
  border-color: var(--crm-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--crm-accent) 18%, transparent);
}

.search :deep(input) {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  font: inherit;
  font-size: 13.5px;
  color: var(--crm-text-1);
  background: none;
  border: 0;
  outline: none;
}

.search :deep(input::placeholder) {
  color: var(--crm-text-3);
}

.control {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 11px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--crm-text-2);
  white-space: nowrap;
  cursor: pointer;
  background: var(--crm-control);
  border: 1px solid var(--crm-line);
  border-radius: 9px;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.control:hover {
  color: var(--crm-text-1);
  background: var(--crm-control-hover);
}

.control:focus-visible,
.control:focus-within {
  outline: 2px solid var(--crm-focus);
  outline-offset: 2px;
}

.control[aria-pressed="true"] {
  color: var(--crm-text-1);
  border-color: color-mix(in srgb, var(--crm-star) 55%, transparent);
  background: color-mix(in srgb, var(--crm-star) 10%, var(--crm-control));
}

.control[aria-pressed="true"] .star-icon {
  color: var(--crm-star);
}

.sort {
  position: relative;
  padding-right: 8px;
}

.sort select {
  appearance: none;
  padding: 0 4px 0 0;
  font: inherit;
  color: var(--crm-text-1);
  cursor: pointer;
  background: none;
  border: 0;
  outline: none;
}

.sort select option {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.badge {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--vy-gradient-strong);
  border-radius: 999px;
}

.columns-popover {
  margin-left: auto;
}

/* ---- Menus inside popovers ---- */

.menu {
  display: grid;
  gap: 1px;
  min-width: 200px;
  margin: 0;
  padding: 0;
  border: 0;
}

.menu legend,
.menu-title {
  float: left;
  width: 100%;
  margin: 0;
  padding: 6px 8px 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--crm-text-3);
}

.menu-check,
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 32px;
  padding: 4px 8px;
  font: inherit;
  font-size: 13px;
  color: var(--crm-text-1);
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 7px;
}

.menu-check:hover,
.menu-item:hover,
.menu-item:focus-visible {
  background: var(--crm-control-hover);
  outline: none;
}

.menu-check:has(input:disabled) {
  cursor: default;
  opacity: 0.55;
}

/* ---- Filters ---- */

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.segmented {
  display: flex;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  background: var(--crm-chip);
  border: 1px solid var(--crm-line);
  border-radius: 11px;
  scrollbar-width: none;
}

.segmented button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 11px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  color: var(--crm-text-3);
  cursor: pointer;
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    background 0.15s,
    color 0.15s;
}

.segmented button:hover {
  color: var(--crm-text-1);
}

.segmented button:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: -1px;
}

.segmented button[aria-pressed="true"] {
  color: var(--crm-text-1);
  background: var(--crm-surface);
  border-color: var(--crm-line);
  box-shadow: 0 1px 2px rgb(20 10 40 / 0.08);
}

.segmented i {
  --tone: var(--crm-stage-lead);
  width: 7px;
  height: 7px;
  background: var(--tone);
  border-radius: 50%;
}

.segmented [data-stage="qualified"] i {
  --tone: var(--crm-stage-qualified);
}

.segmented [data-stage="proposal"] i {
  --tone: var(--crm-stage-proposal);
}

.segmented [data-stage="customer"] i {
  --tone: var(--crm-stage-customer);
}

.segmented [data-stage="churned"] i {
  --tone: var(--crm-stage-churned);
}

.owners {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.owners-label {
  margin-right: 2px;
  font-size: 12px;
  font-weight: 550;
  color: var(--crm-text-3);
}

.owner-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px 0 3px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--crm-text-2);
  cursor: pointer;
  background: var(--crm-control);
  border: 1px solid var(--crm-line);
  border-radius: 999px;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    box-shadow 0.15s;
}

.owner-chip:hover {
  color: var(--crm-text-1);
  background: var(--crm-control-hover);
}

.owner-chip:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: 2px;
}

.owner-chip[aria-pressed="true"] {
  color: var(--crm-text-1);
  background: color-mix(in srgb, var(--crm-accent) 10%, var(--crm-control));
  border-color: color-mix(in srgb, var(--crm-accent) 60%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--crm-accent) 12%, transparent);
}

/* Several owners are a one-of filter: any pressed owner passes. */
.owners:has([aria-pressed="true"]) .owner-chip:not([aria-pressed="true"]) :deep(.crm-avatar) {
  filter: grayscale(0.85);
  opacity: 0.6;
}

.active {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: -4px 0 0;
  padding: 0;
  list-style: none;
}

.active li {
  margin: 0;
}

.active-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 7px 0 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--crm-accent-text);
  cursor: pointer;
  background: color-mix(in srgb, var(--crm-accent) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--crm-accent) 24%, transparent);
  border-radius: 999px;
}

.active-chip:hover {
  background: color-mix(in srgb, var(--crm-accent) 16%, transparent);
}

.clear-all {
  height: 26px;
  padding: 0 8px;
  font: inherit;
  font-size: 12px;
  font-weight: 550;
  color: var(--crm-text-3);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 6px;
}

.clear-all:hover {
  color: var(--crm-text-1);
  text-decoration: underline;
}

.active-chip:focus-visible,
.clear-all:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: 1px;
}

.chip-enter-active,
.chip-leave-active {
  transition:
    opacity 0.18s,
    transform 0.18s var(--vy-ease);
}

.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

/* ---- Checkboxes, drawn once for every view ---- */

.crm :deep(input[type="checkbox"]) {
  display: inline-grid;
  flex: none;
  place-content: center;
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  appearance: none;
  background: var(--crm-control);
  border: 1.5px solid var(--crm-line-strong);
  border-radius: 5px;
  transition:
    background 0.12s,
    border-color 0.12s;
}

.crm :deep(input[type="checkbox"]:hover) {
  border-color: var(--crm-accent);
}

.crm :deep(input[type="checkbox"]:focus-visible) {
  outline: 2px solid var(--crm-focus);
  outline-offset: 2px;
}

.crm :deep(input[type="checkbox"]:checked),
.crm :deep(input[type="checkbox"]:indeterminate) {
  background: var(--crm-accent);
  border-color: var(--crm-accent);
}

.crm :deep(input[type="checkbox"]::before) {
  width: 9px;
  height: 9px;
  content: "";
  background: #fff;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  transform: scale(0);
  transition: transform 0.12s var(--vy-ease);
}

.crm :deep(input[type="checkbox"]:checked::before) {
  transform: scale(1);
}

.crm :deep(input[type="checkbox"]:indeterminate::before) {
  height: 2px;
  clip-path: none;
  border-radius: 1px;
  transform: scale(1);
}

.crm :deep(input[type="checkbox"]:disabled) {
  cursor: default;
  opacity: 0.5;
}

/* ---- Empty ---- */

.empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 48px 20px;
  text-align: center;
  background: var(--crm-surface);
  border: 1px dashed var(--crm-line-strong);
  border-radius: 14px;
}

.empty strong {
  font-size: 15px;
  font-weight: 600;
}

.empty span {
  max-width: 36ch;
  font-size: 13px;
  color: var(--crm-text-3);
}

.empty .control {
  margin-top: 8px;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 6px;
  color: var(--crm-accent-text) !important;
  background: color-mix(in srgb, var(--crm-accent) 10%, transparent);
  border-radius: 12px;
}

/* ---- Footer ---- */

.crm-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
  font-size: 13px;
  color: var(--crm-text-3);
}

.status {
  flex: 1 1 auto;
  margin: 0;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.status strong {
  font-weight: 600;
  color: var(--crm-text-1);
}

.page-size {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.page-size :deep(select) {
  height: 30px;
  padding: 0 8px;
  font: inherit;
  color: var(--crm-text-1);
  cursor: pointer;
  background: var(--crm-control);
  border: 1px solid var(--crm-line);
  border-radius: 8px;
}

.page-size :deep(select:focus-visible) {
  outline: 2px solid var(--crm-focus);
  outline-offset: 1px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pager button {
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  color: var(--crm-text-2);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
}

.pager button:hover:not(:disabled) {
  color: var(--crm-text-1);
  background: var(--crm-control-hover);
}

.pager button:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: 1px;
}

.pager button[aria-current="page"] {
  color: var(--crm-text-1);
  background: var(--crm-surface);
  border-color: var(--crm-line);
  box-shadow: 0 1px 2px rgb(20 10 40 / 0.08);
}

.pager button:disabled {
  cursor: default;
  opacity: 0.35;
}

.gap {
  padding: 0 2px;
}

/* ---- Floating selection bar ---- */

.floating {
  position: sticky;
  bottom: 18px;
  z-index: 20;
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
}

.floating > * {
  pointer-events: auto;
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-self: center;
  gap: 4px;
  max-width: 100%;
  padding: 6px;
  color: var(--crm-bar-text);
  background: var(--crm-bar);
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 14px;
  box-shadow:
    0 20px 40px -12px rgb(20 10 40 / 0.45),
    0 0 0 1px rgb(0 0 0 / 0.04);
}

.selected {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 6px;
  font-size: 13px;
  font-weight: 500;
}

.selected-count {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--vy-gradient-strong);
  border-radius: 8px;
}

.bar-link {
  height: 30px;
  padding: 0 8px;
  font: inherit;
  font-size: 13px;
  color: #d9b8ff;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 8px;
}

.bar-link:hover {
  text-decoration: underline;
}

.bar-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgb(255 255 255 / 0.14);
}

.bar-button,
.bar-popover :deep(.trigger) {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 11px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--crm-bar-text);
  cursor: pointer;
  background: rgb(255 255 255 / 0.06);
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 9px;
}

.bar-button:hover,
.bar-popover :deep(.trigger:hover),
.bar-popover :deep(.trigger[aria-expanded="true"]) {
  color: #fff;
  background: rgb(255 255 255 / 0.13);
}

.bar-button:focus-visible,
.bar-link:focus-visible {
  outline: 2px solid #cf8bff;
  outline-offset: 2px;
}

.bar-clear {
  color: rgb(243 241 250 / 0.75);
  background: none;
  border-color: transparent;
}

.bar-enter-active,
.bar-leave-active {
  transition:
    opacity 0.2s,
    transform 0.25s var(--vy-ease);
}

.bar-enter-from,
.bar-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

.toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 14px 8px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--crm-text-1);
  white-space: nowrap;
  background: var(--crm-raised);
  border: 1px solid var(--crm-line);
  border-radius: 999px;
  box-shadow: var(--crm-shadow-pop);
}

.toast .crm-icon {
  color: var(--crm-fresh);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.25s var(--vy-ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (max-width: 560px) {
  .owner-first {
    display: none;
  }

  .owner-chip {
    padding: 0 3px;
  }

  .columns-popover {
    margin-left: 0;
  }

  .crm-foot {
    justify-content: space-between;
  }

  .status {
    flex-basis: 100%;
  }
}
</style>
