<script setup lang="ts">
import { DataTableSelectRow, injectDataTable } from "vueye-table";

import CompanyMark from "./CompanyMark.vue";
import CrmAvatar from "./CrmAvatar.vue";
import CrmIcon from "./CrmIcon.vue";
import { formatMoney, ownerName, type Contact } from "./data";
import LastContacted from "./LastContacted.vue";
import StagePill from "./StagePill.vue";
import TagChips from "./TagChips.vue";

/*
 * The cards view reads the same `table.rows` as the table view: the same search, filters, sort,
 * page, and selection, drawn as a grid of cards instead of table rows.
 */
const emit = defineEmits<{ favorite: [id: string] }>();
const table = injectDataTable<Contact>("<ContactCards>");
</script>

<template>
  <ul class="cards" aria-label="Contacts">
    <li
      v-for="row in table.rows"
      :key="row.key"
      class="card"
      :data-selected="table.isSelected(row.key) ? '' : undefined"
    >
      <div class="card-top">
        <DataTableSelectRow :row="row" :label="`Select ${row.original.name}`" />
        <StagePill :stage="row.original.stage" />
        <button
          type="button"
          class="star"
          :data-on="row.original.favorite ? '' : undefined"
          :aria-pressed="row.original.favorite"
          :aria-label="`Favorite ${row.original.name}`"
          @click="emit('favorite', row.original.id)"
        >
          <CrmIcon name="star" :size="16" :filled="row.original.favorite" />
        </button>
      </div>

      <div class="identity">
        <CrmAvatar :name="row.original.name" :size="44" />
        <div class="identity-text">
          <h3>{{ row.original.name }}</h3>
          <p>{{ row.original.role }}</p>
        </div>
      </div>

      <dl class="facts">
        <div>
          <dt>Company</dt>
          <dd><CompanyMark :name="row.original.company" /></dd>
        </div>
        <div>
          <dt>Deal value</dt>
          <dd class="money">{{ formatMoney(row.original.dealValue) }}</dd>
        </div>
      </dl>

      <TagChips :tags="row.original.tags" :max="3" />

      <div class="card-foot">
        <span class="owner" :title="`Owner: ${ownerName(row.original.owner)}`">
          <CrmAvatar :name="ownerName(row.original.owner)" :size="20" />
          {{ ownerName(row.original.owner).split(" ")[0] }}
        </span>
        <LastContacted :day="row.original.lastContacted" />
        <a
          class="mail"
          :href="`mailto:${row.original.email}`"
          :aria-label="`Email ${row.original.name}`"
          :title="row.original.email"
        >
          <CrmIcon name="mail" :size="15" />
        </a>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 14px 14px 12px;
  background: var(--crm-surface);
  border: 1px solid var(--crm-line);
  border-radius: 14px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.2s var(--vy-ease);
}

.card:hover {
  border-color: var(--crm-line-strong);
  box-shadow: var(--crm-shadow-card);
  transform: translateY(-1px);
}

.card[data-selected] {
  background: var(--crm-row-selected);
  border-color: color-mix(in srgb, var(--crm-accent) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--crm-accent) 14%, transparent);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.star {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  padding: 0;
  color: var(--crm-text-3);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 8px;
}

.star:hover {
  color: var(--crm-star);
  background: var(--crm-control-hover);
}

.star[data-on] {
  color: var(--crm-star);
}

.star:focus-visible,
.mail:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: 1px;
}

.identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.identity-text {
  min-width: 0;
}

.identity h3 {
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--crm-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
}

.identity p {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.3;
  color: var(--crm-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.facts {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin: 0;
  padding: 10px 0 0;
  border-top: 1px dashed var(--crm-line);
}

.facts div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.facts dt {
  font-size: 11px;
  font-weight: 550;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--crm-text-3);
}

.facts dd {
  margin: 0;
  font-size: 13px;
  color: var(--crm-text-1);
}

.money {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.card-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 10px;
  font-size: 12.5px;
  border-top: 1px solid var(--crm-line-soft);
}

.owner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--crm-text-2);
}

.mail {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  color: var(--crm-text-3);
  border-radius: 8px;
}

.mail:hover {
  color: var(--crm-accent-text);
  background: var(--crm-control-hover);
}
</style>
