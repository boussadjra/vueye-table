<script setup lang="ts">
import { ref } from "vue";
import { VueyeTable, type ColumnDef, type ExpandedState, type TableRow } from "vueye-table";

import { pause } from "../examples/live-logs/source";
import DemoFrame from "./DemoFrame.vue";

interface FileEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: "Folder" | "File";
  readonly bytes: number;
}
const folders = new Map<string, readonly FileEntry[]>();
const roots: readonly FileEntry[] = Array.from({ length: 12 }, (_root, folder) => {
  const id = `folder-${folder}`;
  const children = Array.from(
    { length: 8 },
    (_, file): FileEntry => ({
      id: `${id}-${file}`,
      name: `Document ${file + 1}.txt`,
      kind: "File",
      bytes: (folder + 1) * (file + 1) * 1024,
    }),
  );
  folders.set(id, children);
  return {
    id,
    name: `Project ${String(folder + 1).padStart(2, "0")}`,
    kind: "Folder",
    bytes: children.reduce((total, file) => total + file.bytes, 0),
  };
});
const columns: readonly ColumnDef<FileEntry>[] = [
  { id: "name", width: 280 },
  { id: "kind", header: "Type", width: 100 },
  {
    id: "bytes",
    header: "Size",
    width: 100,
    align: "end",
    format: (value) => `${value / 1024} KiB`,
  },
];
const expanded = ref<ExpandedState>([]);
const virtual = ref(true);
const failNext = ref(false);
const getChildren = (): undefined => undefined;
const hasChildren = (entry: FileEntry): boolean => entry.kind === "Folder";
async function loadChildren(
  row: TableRow<FileEntry>,
  signal: AbortSignal,
): Promise<readonly FileEntry[]> {
  await pause(signal, 450);
  if (failNext.value) {
    failNext.value = false;
    throw new Error("Simulated folder request failed");
  }
  return folders.get(String(row.key)) ?? [];
}
</script>

<template>
  <DemoFrame title="FileExplorer.vue" class="completion-demo">
    <div class="demo-controls">
      <label><input v-model="virtual" type="checkbox" /> Virtual rows</label>
      <button type="button" :disabled="failNext" @click="failNext = true">
        {{ failNext ? "Failure queued" : "Fail next folder load" }}
      </button>
    </div>
    <p class="demo-help">
      Generated project files load on first expansion. Folder sizes are totals supplied by the
      simulated API, including unloaded files. Focus a row: Right opens, Left closes, and * opens
      siblings. Select a folder to select its loaded children.
    </p>
    <VueyeTable
      :key="String(virtual)"
      v-model:expanded="expanded"
      :data="roots"
      :columns="columns"
      row-key="id"
      tree-column="name"
      :get-children="getChildren"
      :has-children="hasChildren"
      :load-children="loadChildren"
      :virtual="virtual"
      height="var(--completion-height)"
      max-height="var(--completion-height)"
      :row-height="44"
      :paginate="false"
      :pagination="false"
      selectable
      :column-toggle="false"
      caption="Sample project files"
    />
  </DemoFrame>
</template>

<style src="./completion-demos.css"></style>
