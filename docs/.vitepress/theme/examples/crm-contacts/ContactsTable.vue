<script setup lang="ts">
import {
  DataTableCell,
  DataTableHeaderCell,
  DataTableRoot,
  DataTableRow,
  DataTableSelectAll,
  DataTableSelectRow,
  DataTableSortButton,
  injectDataTable,
} from "vueye-table";

import CompanyMark from "./CompanyMark.vue";
import CrmAvatar from "./CrmAvatar.vue";
import CrmIcon from "./CrmIcon.vue";
import { formatMoney, ownerName, type Contact } from "./data";
import LastContacted from "./LastContacted.vue";
import StagePill from "./StagePill.vue";
import TagChips from "./TagChips.vue";

/*
 * The table view: our own <table> markup around headless pieces. The engine decides which rows,
 * columns, and sort; this component only decides how a contact looks in a row.
 */
const emit = defineEmits<{ favorite: [id: string] }>();
const table = injectDataTable<Contact>("<ContactsTable>");
</script>

<template>
  <div class="scroll">
    <DataTableRoot :table="table" class="contacts-table">
      <caption class="sr-only">
        Contacts
      </caption>
      <thead>
        <tr>
          <th class="select-col" scope="col">
            <DataTableSelectAll label="Select every matching contact" />
          </th>
          <DataTableHeaderCell v-for="column in table.columns" :key="column.id" :column="column">
            <DataTableSortButton v-if="column.sortable" :column="column" class="sort-button">
              {{ column.header }}
              <template #indicator="{ sort }">
                <span class="sort-indicator" :data-active="sort ? '' : undefined">
                  <CrmIcon
                    :name="sort?.direction === 'desc' ? 'arrowDown' : 'arrowUp'"
                    :size="13"
                  />
                  <small v-if="sort && table.state.sorting.length > 1">{{
                    sort.priority + 1
                  }}</small>
                </span>
              </template>
            </DataTableSortButton>
            <span v-else class="plain-header">{{ column.header }}</span>
          </DataTableHeaderCell>
        </tr>
      </thead>
      <tbody>
        <DataTableRow v-for="row in table.rows" :key="row.key" :row="row" class="contact-row">
          <td class="select-col">
            <DataTableSelectRow :row="row" :label="`Select ${row.original.name}`" />
          </td>
          <DataTableCell
            v-for="column in table.columns"
            :key="column.id"
            :row="row"
            :column="column"
          >
            <template #default="{ display }">
              <div v-if="column.id === 'name'" class="person">
                <CrmAvatar :name="row.original.name" :size="30" />
                <span class="person-text">
                  <strong>{{ row.original.name }}</strong>
                  <small v-if="table.state.hiddenColumns.includes('role')">
                    {{ row.original.role }}
                  </small>
                </span>
                <button
                  type="button"
                  class="star"
                  :data-on="row.original.favorite ? '' : undefined"
                  :aria-pressed="row.original.favorite"
                  :aria-label="`Favorite ${row.original.name}`"
                  @click="emit('favorite', row.original.id)"
                >
                  <CrmIcon name="star" :size="15" :filled="row.original.favorite" />
                </button>
              </div>
              <CompanyMark v-else-if="column.id === 'company'" :name="row.original.company" />
              <a
                v-else-if="column.id === 'email'"
                class="email"
                :href="`mailto:${row.original.email}`"
                >{{ row.original.email }}</a
              >
              <span v-else-if="column.id === 'phone'" class="mono">{{ row.original.phone }}</span>
              <span v-else-if="column.id === 'owner'" class="owner">
                <CrmAvatar :name="ownerName(row.original.owner)" :size="20" />
                {{ display.split(" ")[0] }}
              </span>
              <StagePill v-else-if="column.id === 'stage'" :stage="row.original.stage" />
              <TagChips v-else-if="column.id === 'tags'" :tags="row.original.tags" :max="2" />
              <LastContacted
                v-else-if="column.id === 'lastContacted'"
                :day="row.original.lastContacted"
              />
              <span v-else-if="column.id === 'dealValue'" class="money">{{
                formatMoney(row.original.dealValue)
              }}</span>
              <span v-else-if="column.id === 'favorite'">{{
                row.original.favorite ? "Yes" : "No"
              }}</span>
              <template v-else>{{ display }}</template>
            </template>
          </DataTableCell>
        </DataTableRow>
      </tbody>
    </DataTableRoot>
  </div>
</template>

<style scoped>
.scroll {
  overflow-x: auto;
  border: 1px solid var(--crm-line);
  border-radius: 14px;
  background: var(--crm-surface);
}

.contacts-table {
  width: 100%;
  min-width: 880px;
  margin: 0;
  font-size: 13.5px;
  border-collapse: separate;
  border-spacing: 0;
}

.contacts-table :is(th, td) {
  padding: 0 14px;
  text-align: left;
  vertical-align: middle;
  border: 0;
  border-bottom: 1px solid var(--crm-line-soft);
}

.contacts-table :is(th, td)[data-align="end"] {
  text-align: right;
}

.contacts-table thead th {
  height: 40px;
  font-size: 12px;
  font-weight: 550;
  color: var(--crm-text-3);
  white-space: nowrap;
  background: var(--crm-head);
  border-bottom-color: var(--crm-line);
}

.contacts-table tbody td {
  height: 56px;
  color: var(--crm-text-1);
}

.contacts-table tbody tr:last-child td {
  border-bottom: 0;
}

.select-col {
  width: 44px;
  padding-right: 0 !important;
}

.contact-row {
  transition: background 0.12s;
}

.contact-row:hover td {
  background: var(--crm-row-hover);
}

.contact-row[data-selected] td {
  background: var(--crm-row-selected);
}

.contact-row[data-selected] td:first-child {
  box-shadow: inset 2px 0 0 var(--crm-accent);
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: -6px;
  padding: 4px 6px;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 6px;
}

[data-align="end"] .sort-button {
  flex-direction: row;
  margin-right: -6px;
  margin-left: 0;
}

.sort-button:hover {
  color: var(--crm-text-1);
  background: var(--crm-control-hover);
}

.sort-button:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: 1px;
}

.sort-button[data-sort] {
  color: var(--crm-text-1);
}

.sort-indicator {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.12s;
}

.sort-button:hover .sort-indicator {
  opacity: 0.45;
}

.sort-indicator[data-active] {
  color: var(--crm-accent-text);
  opacity: 1 !important;
}

.sort-indicator small {
  font-size: 10px;
  font-weight: 700;
}

.person {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.person-text {
  display: grid;
  min-width: 0;
  line-height: 1.25;
}

.person-text strong {
  overflow: hidden;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-text small {
  overflow: hidden;
  font-size: 12px;
  color: var(--crm-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.star {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  margin-left: auto;
  padding: 0;
  color: var(--crm-text-3);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 7px;
  opacity: 0;
  transition:
    opacity 0.12s,
    color 0.12s,
    background 0.12s;
}

.contact-row:hover .star,
.star:focus-visible,
.star[data-on] {
  opacity: 1;
}

.star:hover {
  color: var(--crm-star);
  background: var(--crm-control-hover);
}

.star[data-on] {
  color: var(--crm-star);
}

.star:focus-visible {
  outline: 2px solid var(--crm-focus);
}

@media (hover: none) {
  .star {
    opacity: 1;
  }
}

.email {
  color: var(--crm-text-2);
  text-decoration: none;
}

.email:hover {
  color: var(--crm-accent-text);
  text-decoration: underline;
}

.mono,
.money {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.money {
  font-weight: 550;
}

.owner {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--crm-text-2);
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
