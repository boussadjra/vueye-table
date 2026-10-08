<script setup lang="ts">
import { ref, watch } from "vue";
import {
  VueyeGrid,
  VueyeTable,
  type ColumnDef,
  type ExpandedState,
  type TableRow,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Entry {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly kind: "Folder" | "File";
  readonly children?: readonly Entry[];
}
const mode = ref<"tree" | "details">("tree");
const surface = ref<"table" | "grid">("table");
const virtual = ref(false);
const keepAlive = ref(false);
const failNext = ref(false);
const expanded = ref<ExpandedState>(["project-1"]);
const columns: readonly ColumnDef<Entry>[] = [
  { id: "name", header: "Name", width: 230 },
  { id: "owner", header: "Owner", width: 110 },
  { id: "kind", header: "Type", width: 100 },
];
const children = (id: string): readonly Entry[] => [
  { id: `${id}-brief`, name: "Design brief", owner: "Mina", kind: "File" },
  { id: `${id}-notes`, name: "Review notes", owner: "Sam", kind: "File" },
];
const entries: readonly Entry[] = Array.from({ length: 24 }, (_, index) => ({
  id: `project-${index + 1}`,
  name: `Sample project ${String(index + 1).padStart(2, "0")}`,
  owner: index % 2 === 0 ? "Mina" : "Sam",
  kind: "Folder",
  ...(index === 0 ? { children: children("project-1") } : {}),
}));
const getChildren = (entry: Entry): readonly Entry[] | undefined => entry.children;
const hasChildren = (entry: Entry): boolean => entry.kind === "Folder" && !entry.children;
async function loadChildren(row: TableRow<Entry>, signal: AbortSignal): Promise<readonly Entry[]> {
  await new Promise<void>((resolve, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new Error("Loading stopped"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 600);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  if (failNext.value) {
    failNext.value = false;
    throw new Error("Simulated children failure");
  }
  return children(String(row.key));
}
watch([mode, surface, virtual], () => {
  expanded.value = ["project-1"];
  failNext.value = false;
});
</script>

<template>
  <DemoFrame title="HierarchyComponents.vue" class="hierarchy-demo">
    <div class="controls">
      <label
        >Content
        <select v-model="mode">
          <option value="tree">Project tree</option>
          <option value="details">Project details</option>
        </select>
      </label>
      <label
        >View
        <select v-model="surface">
          <option value="table">Data table</option>
          <option value="grid">Spreadsheet</option>
        </select>
      </label>
      <label class="check"><input v-model="virtual" type="checkbox" /> Virtual rows</label>
      <label v-if="mode === 'details'" class="check"
        ><input v-model="keepAlive" type="checkbox" /> Keep detail notes</label
      >
      <button v-else type="button" :disabled="failNext" @click="failNext = true">
        {{ failNext ? "Failure queued" : "Fail next folder load" }}
      </button>
    </div>
    <p id="hierarchy-help">
      Generated sample projects.
      <template v-if="mode === 'tree'"
        >Open a folder to load its files. Queue a failure to try Retry children. Focus a row{{
          surface === "grid" ? "’s Name cell" : ""
        }}; use Right/Left to open or close, and * to open siblings.</template
      >
      <template v-else
        >Open project details and type a note. Close and reopen to compare the default reset with
        Keep detail notes.</template
      >
    </p>
    <component
      :is="surface === 'table' ? VueyeTable : VueyeGrid"
      v-if="mode === 'tree'"
      :key="`tree-${surface}-${virtual}`"
      v-model:expanded="expanded"
      :data="entries"
      :columns="columns"
      :get-children="getChildren"
      :has-children="hasChildren"
      :load-children="loadChildren"
      tree-column="name"
      :virtual="virtual"
      height="var(--hierarchy-demo-height)"
      max-height="var(--hierarchy-demo-height)"
      :row-height="44"
      :overscan="2"
      :paginate="false"
      :pagination="false"
      :searchable="false"
      :column-toggle="false"
      :toolbar="false"
      :editable="false"
      :row-numbers="false"
      :selectable="surface === 'table'"
      caption="Sample project files"
      label="Sample project files"
      aria-describedby="hierarchy-help"
    />
    <component
      :is="surface === 'table' ? VueyeTable : VueyeGrid"
      v-else
      :key="`details-${surface}-${virtual}`"
      v-model:expanded="expanded"
      :data="entries"
      :columns="columns"
      :keep-alive-detail="keepAlive"
      :virtual="virtual"
      height="var(--hierarchy-demo-height)"
      max-height="var(--hierarchy-demo-height)"
      :row-height="44"
      :overscan="2"
      :paginate="false"
      :pagination="false"
      :searchable="false"
      :column-toggle="false"
      :toolbar="false"
      :editable="false"
      :row-numbers="false"
      caption="Sample project details"
      label="Sample project details"
      aria-describedby="hierarchy-help"
    >
      <template #expanded="{ row }">
        <div class="project-detail">
          <p>
            <strong>{{ row.getValue("name") }}</strong> · Two sample files, owned by
            {{ row.getValue("owner") }}.
          </p>
          <label
            >Local note<input
              type="text"
              :aria-label="`${row.getValue('name')} local note`"
              placeholder="Add a review note"
          /></label>
        </div>
      </template>
    </component>
  </DemoFrame>
</template>

<style scoped>
.hierarchy-demo {
  --hierarchy-demo-height: 280px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
}
label {
  display: grid;
  gap: 4px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.check {
  display: flex;
  align-items: center;
  min-height: 36px;
  gap: 6px;
}
select,
button,
input[type="text"] {
  padding: 8px 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vy-radius-sm);
  font-size: 13px;
}
input[type="checkbox"] {
  accent-color: var(--vp-c-brand-1);
}
input[type="text"] {
  width: min(100%, 22rem);
  caret-color: var(--vp-c-brand-1);
}
input::placeholder {
  color: var(--vp-c-text-2);
}
button:hover {
  background: var(--vp-c-brand-soft);
}
button:disabled {
  opacity: 0.6;
}
select:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.project-detail p {
  margin-top: 0;
}
@media (max-width: 640px) {
  .hierarchy-demo {
    --hierarchy-demo-height: 220px;
  }
}
</style>
