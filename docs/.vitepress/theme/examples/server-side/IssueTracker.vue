<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { defineColumns, type AnyDataTableBinding } from "vueye-table";

import { ISSUE_COUNT, LABELS, NOW, type Issue, type IssueState } from "./api";
import NetworkLog from "./NetworkLog.vue";
import { useIssueQuery } from "./use-issue-query";

const {
  page,
  pageSize,
  sorting,
  search,
  filters,
  rows,
  total,
  counts,
  loading,
  error,
  requests,
  failNext,
  retry,
} = useIssueQuery();

const columns = defineColumns<Issue>([
  { id: "title", header: "Issue" },
  { id: "state" },
  { id: "author" },
  { id: "comments", header: "Replies", align: "end" },
  { id: "updated", format: (updated) => relative(updated) },
  // Shown inside the issue cell; a column of its own so `filters.labels` names a real column.
  { id: "labels", hidden: true, sortable: false, format: (labels) => labels.join(", ") },
]);

const view = useTemplateRef<{ readonly table: AnyDataTableBinding }>("view");

/* Filters go through the table's own operation, which returns to page 1 like search and sort do. */
function setFilter(column: "state" | "labels", value: unknown): void {
  view.value?.table.filter(column, value);
}

const activeState = computed(() => filters.value["state"] as IssueState | undefined);
const activeLabels = computed(
  () => (filters.value["labels"] as readonly string[] | undefined) ?? [],
);

function toggleLabel(label: string): void {
  const current = activeLabels.value;
  setFilter(
    "labels",
    current.includes(label) ? current.filter((each) => each !== label) : [...current, label],
  );
}

const number = new Intl.NumberFormat("en-US");
const stateOptions = computed(() => [
  { value: "open" as const, label: "Open", count: counts.value?.open },
  { value: "closed" as const, label: "Closed", count: counts.value?.closed },
  {
    value: undefined,
    label: "All",
    count: counts.value ? counts.value.open + counts.value.closed : undefined,
  },
]);

function relative(iso: string): string {
  const minutes = Math.max(1, Math.round((NOW - Date.parse(iso)) / 60_000));
  const steps: [number, string][] = [
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let amount = minutes;
  for (const [size, unit] of steps) {
    if (amount < size) {
      return `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
    }
    amount = Math.floor(amount / size);
  }
  return "";
}

function exact(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function slug(label: string): string {
  return label.replaceAll(" ", "-");
}

const gradients = [
  ["#a02de6", "#c9117f"],
  ["#c9117f", "#e1583a"],
  ["#e1583a", "#f2b34a"],
  ["#0c93df", "#a02de6"],
  ["#0c93df", "#37d399"],
  ["#6d28d9", "#0c93df"],
];

function avatar(login: string): { background: string } {
  let hash = 0;
  for (const char of login) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const [from, to] = gradients[hash % gradients.length] as string[];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

function initials(login: string): string {
  return login
    .split("-")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const issue = (item: unknown): Issue => item as Issue;
</script>

<template>
  <DemoFrame title="IssueTracker.vue">
    <div class="tracker">
      <header class="tracker-head">
        <div class="repo">
          <span class="repo-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path
                fill="currentColor"
                d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"
              />
            </svg>
          </span>
          <div class="repo-text">
            <span class="crumb">vueye / <strong>tracker</strong></span>
            <span class="heading">
              Issues
              <span class="heading-meta">
                {{ number.format(ISSUE_COUNT) }} on the server, {{ rows.length }} in the browser
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          class="fail-toggle"
          :aria-pressed="failNext"
          @click="failNext = !failNext"
        >
          <span class="switch" aria-hidden="true"><i /></span>
          Fail next request
        </button>
      </header>

      <div class="labels" role="group" aria-label="Filter by label">
        <span class="labels-title">Label</span>
        <button
          v-for="label in LABELS"
          :key="label"
          type="button"
          class="chip"
          :class="`label-${slug(label)}`"
          :aria-pressed="activeLabels.includes(label)"
          @click="toggleLabel(label)"
        >
          <span class="chip-dot" aria-hidden="true" />{{ label }}
        </button>
        <button
          v-if="activeLabels.length > 0"
          type="button"
          class="chip-clear"
          @click="setFilter('labels', undefined)"
        >
          Clear
        </button>
      </div>

      <Transition name="banner">
        <div v-if="error && rows.length > 0" class="banner" role="alert">
          <span class="banner-icon" aria-hidden="true">!</span>
          <span class="banner-text">
            <strong>Request failed with 500.</strong> The last page that loaded stays on screen.
          </span>
          <button type="button" class="retry" @click="retry">Retry</button>
        </div>
      </Transition>

      <VueyeTable
        ref="view"
        v-model:page="page"
        v-model:page-size="pageSize"
        v-model:sorting="sorting"
        v-model:search="search"
        v-model:filters="filters"
        class="issues"
        :data="rows"
        :columns="columns"
        row-key="number"
        manual
        :row-count="total"
        :loading="loading"
        loading-text="Fetching issues from /api/issues…"
        search-placeholder="Search 10,000 issues…"
        :page-size-options="[10, 25, 50]"
        :column-toggle="false"
        sticky-header
        max-height="32rem"
      >
        <template #toolbar>
          <div class="states" role="group" aria-label="Issue state">
            <button
              v-for="option in stateOptions"
              :key="option.label"
              type="button"
              :aria-pressed="activeState === option.value"
              @click="setFilter('state', option.value)"
            >
              {{ option.label }}
              <span class="state-count">{{
                option.count === undefined ? "–" : number.format(option.count)
              }}</span>
            </button>
          </div>
        </template>

        <template #cell.title="{ item }">
          <span class="issue-cell">
            <span class="title" :title="issue(item).title">{{ issue(item).title }}</span>
            <span class="meta">
              <span class="num">#{{ issue(item).number }}</span>
              <span
                v-for="label in issue(item).labels"
                :key="label"
                class="tag"
                :class="`label-${slug(label)}`"
                >{{ label }}</span
              >
            </span>
          </span>
        </template>
        <template #cell.state="{ item }">
          <span class="pill" :class="`pill-${issue(item).state}`">
            <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12">
              <path
                v-if="issue(item).state === 'open'"
                fill="currentColor"
                d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"
              />
              <path
                v-else
                fill="currentColor"
                d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"
              />
            </svg>
            {{ issue(item).state === "open" ? "Open" : "Closed" }}
          </span>
        </template>
        <template #cell.author="{ item }">
          <span class="author">
            <span class="avatar" :style="avatar(issue(item).author)" aria-hidden="true">{{
              initials(issue(item).author)
            }}</span>
            {{ issue(item).author }}
          </span>
        </template>
        <template #cell.comments="{ value }">
          <span class="comments" :class="{ none: value === 0 }">
            <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13">
              <path
                fill="currentColor"
                d="M1 2.75C1 1.78 1.78 1 2.75 1h10.5c.97 0 1.75.78 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.57 2.57A1.46 1.46 0 0 1 4 13.54V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .14.11.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.75.75 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
              />
            </svg>
            {{ value }}
          </span>
        </template>
        <template #cell.updated="{ item, display }">
          <time class="when" :datetime="issue(item).updated" :title="exact(issue(item).updated)">{{
            display
          }}</time>
        </template>

        <template #status="{ start, end, rowCount }">
          {{
            rowCount === 0
              ? loading
                ? "Loading issues…"
                : "No issues"
              : `${start.toLocaleString("en-US")}–${end.toLocaleString("en-US")} of ${rowCount.toLocaleString("en-US")} issues`
          }}
        </template>
        <template #empty>
          <div class="empty">
            <template v-if="error">
              <strong>Could not load issues.</strong>
              <span>The server answered 500.</span>
              <button type="button" class="retry" @click="retry">Retry</button>
            </template>
            <template v-else>
              <strong>No issues match.</strong>
              <span>The server found nothing for this search and these filters.</span>
            </template>
          </div>
        </template>
      </VueyeTable>
    </div>

    <template #side>
      <NetworkLog :requests="requests" />
    </template>
  </DemoFrame>
</template>

<style scoped>
.tracker {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
}

.tracker-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
}

.repo {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.repo-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  color: #fff;
  background: var(--vy-gradient-strong);
  border-radius: 10px;
  box-shadow: 0 6px 16px -6px rgb(160 45 230 / 0.6);
}

.repo-text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.crumb {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.crumb strong {
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.heading-meta {
  font-size: 12.5px;
  font-weight: 450;
  letter-spacing: 0;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

/* Fail toggle */
.fail-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 6px 12px 6px 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.fail-toggle:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-border);
}

.fail-toggle[aria-pressed="true"] {
  color: #b42318;
  background: rgb(225 88 58 / 0.1);
  border-color: rgb(225 88 58 / 0.45);
}

.dark .fail-toggle[aria-pressed="true"] {
  color: #ff9a8a;
  background: rgb(255 107 107 / 0.1);
}

.switch {
  position: relative;
  width: 26px;
  height: 15px;
  background: var(--vp-c-border);
  border-radius: 999px;
  transition: background 0.2s;
}

.switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 11px;
  height: 11px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 0.2s var(--vy-ease);
}

.fail-toggle[aria-pressed="true"] .switch {
  background: #e1583a;
}

.fail-toggle[aria-pressed="true"] .switch i {
  transform: translateX(11px);
}

/* Label filter */
.labels {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.labels-title {
  margin-right: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s,
    border-color 0.2s;
}

.chip:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-border);
}

.chip[aria-pressed="true"] {
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--label) 14%, transparent);
  border-color: color-mix(in srgb, var(--label) 55%, transparent);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--label);
}

.chip-clear {
  padding: 3px 8px;
  font-size: 12.5px;
  color: var(--vp-c-brand-1);
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.chip-clear:hover {
  text-decoration: underline;
}

.label-bug {
  --label: #e5484d;
}

.label-enhancement {
  --label: #0c93df;
}

.label-performance {
  --label: #e1583a;
}

.label-a11y {
  --label: #a02de6;
}

.label-docs {
  --label: #12a594;
}

.label-regression {
  --label: #c9117f;
}

.label-good-first-issue {
  --label: #30a46c;
}

/* Error banner */
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  padding: 10px 12px;
  font-size: 13px;
  color: #8a1c12;
  background: rgb(229 72 77 / 0.08);
  border: 1px solid rgb(229 72 77 / 0.35);
  border-radius: 12px;
}

.dark .banner {
  color: #ffb4ab;
  background: rgb(229 72 77 / 0.1);
}

.banner-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #e5484d;
  border-radius: 50%;
}

.banner-text {
  flex: 1 1 220px;
}

.retry {
  padding: 5px 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: var(--vy-gradient-strong);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px -4px rgb(160 45 230 / 0.55);
}

.retry:hover {
  filter: brightness(1.1);
}

.banner-enter-active,
.banner-leave-active {
  transition:
    opacity 0.25s var(--vy-ease),
    transform 0.25s var(--vy-ease);
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* State segmented control */
.states {
  display: inline-flex;
  padding: 3px;
  background: var(--vt-header-bg);
  border: 1px solid var(--vt-border);
  border-radius: 10px;
}

.states button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--vt-muted);
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
}

.states button:hover {
  color: var(--vt-fg);
}

.states button[aria-pressed="true"] {
  color: var(--vt-fg);
  background: var(--vt-bg);
  box-shadow:
    0 1px 2px rgb(19 18 26 / 0.12),
    0 0 0 1px var(--vt-border);
}

.state-count {
  min-width: 2ch;
  padding: 0 6px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--vt-muted);
  background: color-mix(in srgb, var(--vt-muted) 14%, transparent);
  border-radius: 999px;
}

.states button[aria-pressed="true"] .state-count {
  color: #fff;
  background: var(--vt-accent);
}

:is(.fail-toggle, .chip, .chip-clear, .retry, .states button):focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

/* Cells */
.issues :deep(td) {
  white-space: nowrap;
}

.issue-cell {
  display: grid;
  gap: 4px;
  padding-block: 2px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 5px;
}

.num {
  margin-right: 3px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vt-muted);
  font-variant-numeric: tabular-nums;
}

.title {
  display: -webkit-box;
  min-width: 24ch;
  max-width: 40ch;
  overflow: hidden;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.4;
  font-weight: 550;
  color: var(--vt-fg);
}

.tag {
  padding: 0 7px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.55;
  color: color-mix(in srgb, var(--label) 72%, #000);
  background: color-mix(in srgb, var(--label) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--label) 30%, transparent);
  border-radius: 999px;
}

.dark .tag {
  color: color-mix(in srgb, var(--label) 55%, #fff);
  background: color-mix(in srgb, var(--label) 18%, transparent);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px 2px 7px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}

.pill-open {
  color: #1a7f4b;
  background: rgb(48 164 108 / 0.12);
}

.pill-closed {
  color: #7a1fb3;
  background: rgb(160 45 230 / 0.1);
}

.dark .pill-open {
  color: #5fd49a;
  background: rgb(48 164 108 / 0.16);
}

.dark .pill-closed {
  color: #cf8bff;
  background: rgb(160 45 230 / 0.18);
}

.author {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff;
  border-radius: 50%;
}

.comments {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--vt-fg);
  font-variant-numeric: tabular-nums;
}

.comments svg {
  color: var(--vt-muted);
}

.comments.none {
  color: var(--vt-muted);
  opacity: 0.6;
}

.when {
  color: var(--vt-muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 2.5rem 1rem;
  color: var(--vt-muted);
  text-align: center;
}

.empty strong {
  color: var(--vt-fg);
}

.empty .retry {
  margin-top: 6px;
}

@media (max-width: 639px) {
  .heading-meta {
    flex-basis: 100%;
  }
}
</style>
