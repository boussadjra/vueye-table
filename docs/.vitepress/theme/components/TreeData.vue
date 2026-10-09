<script setup lang="ts">
import { ref, useId } from "vue";
import { useDataTable, type TreeFilter } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface FileEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: "Folder" | "File";
  readonly children?: readonly FileEntry[] | undefined;
}
const id = useId();
const treeFilter = ref<TreeFilter>("ancestors");
const table = useDataTable<FileEntry, AbortSignal>({
  treeFilter,
  data: [
    {
      id: "design",
      name: "Design",
      kind: "Folder",
      children: [
        {
          id: "brand",
          name: "Brand",
          kind: "Folder",
          children: [{ id: "logo", name: "Logo.svg", kind: "File" }],
        },
        { id: "cover", name: "Cover.png", kind: "File" },
      ],
    },
    {
      id: "website",
      name: "Website",
      kind: "Folder",
      children: [
        { id: "index", name: "Index.html", kind: "File" },
        { id: "styles", name: "Styles.css", kind: "File" },
      ],
    },
    { id: "archive", name: "Archive", kind: "Folder" },
  ],
  columns: [{ id: "name", editable: true }],
  getChildren: (row) => row.children,
  setChildren: (row, children) => ({ ...row, children }),
  hasChildren: (row) => row.kind === "Folder",
  createChildLoadController: () => new AbortController(),
  loadChildren: (_row, signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          resolve([
            { id: "draft", name: "Draft.md", kind: "File" },
            { id: "notes", name: "Notes.txt", kind: "File" },
          ]),
        700,
      );
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("Cancelled"));
        },
        { once: true },
      );
    }),
  initialState: { expanded: ["design", "brand"], pagination: { page: 1, pageSize: 2 } },
});
function rename(key: string | number, event: Event) {
  const target = event.target;
  if (target instanceof HTMLInputElement)
    table.edit({ rowKey: key, column: "name", input: target.value });
}
</script>

<template>
  <DemoFrame title="TreeData.vue">
    <div class="controls">
      <label :for="`${id}-search`">Find a file</label>
      <input
        :id="`${id}-search`"
        type="search"
        placeholder="Try Logo"
        :value="table.state.search"
        @input="table.search(($event.target as HTMLInputElement).value)"
      />
      <button type="button" @click="table.expandAll">Expand all</button>
      <button type="button" @click="table.collapseAll">Collapse all</button>
      <label :for="`${id}-context`">Search context</label>
      <select :id="`${id}-context`" v-model="treeFilter">
        <option value="ancestors">Keep ancestors</option>
        <option value="descendants">Include descendants</option>
        <option value="strict">Matching leaves only</option>
      </select>
    </div>
    <p class="help">
      Sample files. Rename a file inline, select a folder, or open Archive on the next page to load
      its children. Search for Logo, then change Search context without losing your selection or
      rename.
    </p>
    <div class="results">
      <table aria-label="Project files">
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Select</span></th>
            <th scope="col">
              <button type="button" @click="table.toggleSort('name')">
                Name
                <span v-if="table.getSort('name')">{{
                  table.getSort("name")?.direction === "asc" ? "ascending" : "descending"
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.rows" :key="row.key">
            <td>
              <input
                type="checkbox"
                :aria-label="`Select ${row.original.name} and its loaded children`"
                :checked="row.selection === 'all'"
                :indeterminate="row.selection === 'some'"
                @change="table.toggleRow(row.key)"
              />
            </td>
            <td>
              <div class="entry" :style="{ paddingInlineStart: `${row.depth * 14}px` }">
                <button
                  v-if="row.canExpand"
                  type="button"
                  class="disclosure"
                  :aria-label="`${row.isExpanded ? 'Collapse' : 'Expand'} ${row.original.name}`"
                  :aria-expanded="row.isExpanded"
                  @click="table.toggleExpanded(row.key)"
                >
                  <svg
                    viewBox="0 0 20 20"
                    width="18"
                    height="18"
                    aria-hidden="true"
                    :class="{ open: row.isExpanded }"
                  >
                    <path
                      d="m7 4 6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg></button
                ><span v-else class="leaf-space" />
                <div class="file">
                  <input
                    :aria-label="`Rename ${row.original.name}`"
                    :value="row.original.name"
                    @change="rename(row.key, $event)"
                  />
                  <span
                    >{{ row.original.kind
                    }}<template v-if="row.childStatus === 'loading'"> · Loading children…</template
                    ><template v-else-if="row.childStatus === 'error'">
                      · Load failed; close and reopen to retry</template
                    ></span
                  >
                </div>
              </div>
            </td>
          </tr>
          <tr v-if="table.rows.length === 0">
            <td colspan="2">No matching files. Clear the search to see every folder.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="controls footer">
      <button type="button" :disabled="!table.canPreviousPage" @click="table.previousPage">
        Previous page
      </button>
      <p role="status">
        Page {{ table.page }} of {{ table.pageCount }} · {{ table.selectedCount }} selected
      </p>
      <button type="button" :disabled="!table.canNextPage" @click="table.nextPage">
        Next page
      </button>
      <button type="button" :disabled="!table.canUndo" @click="table.undo">Undo rename</button>
    </div>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
label,
button,
input,
select,
p {
  font-size: 13px;
}
input[type="search"] {
  flex: 1;
  min-width: 120px;
  width: 100%;
}
button,
select,
input[type="search"] {
  min-height: 44px;
  padding: 8px 12px;
  border-radius: var(--vy-radius-sm);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
button:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}
button:disabled {
  opacity: 0.45;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
input {
  accent-color: var(--vp-c-brand-1);
  caret-color: var(--vp-c-brand-1);
}
.help {
  margin: 14px 0;
  max-width: 65ch;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.results {
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-sm);
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: start;
  padding: 6px;
}
th {
  background: var(--vp-c-bg-soft);
}
th:first-child,
td:first-child {
  width: 38px;
  text-align: center;
}
td {
  border-top: 1px solid var(--vy-card-border);
}
input[type="checkbox"] {
  width: 18px;
  height: 18px;
}
.entry {
  display: flex;
  align-items: center;
  min-width: 0;
}
.disclosure,
.leaf-space {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
}
.disclosure {
  padding: 0;
  display: grid;
  place-items: center;
  background: transparent;
}
svg {
  transition: transform 150ms var(--vy-ease);
}
svg.open {
  transform: rotate(90deg);
}
.file {
  flex: 1;
  min-width: 0;
}
.file input {
  display: block;
  width: 100%;
  min-height: 32px;
  padding: 4px;
  color: var(--vp-c-text-1);
  background: transparent;
  border-radius: 4px;
}
.file input:hover {
  background: var(--vp-c-bg-soft);
}
.file span {
  display: block;
  padding-inline: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.footer {
  margin-top: 16px;
}
.footer p {
  margin: 0;
  color: var(--vp-c-text-2);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  svg {
    transition: none;
  }
}
</style>
