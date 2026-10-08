---
aside: false
---

<script setup lang="ts">
import HierarchyComponents from "../.vitepress/theme/components/HierarchyComponents.vue";
</script>

# Tree and detail components

Open project folders, retry a simulated child-load failure, or switch to project details to try
retained form state. Both views work as a data table or spreadsheet, with optional virtual rows.

<HierarchyComponents />

The generated projects are local samples; folder requests are simulated with cancellable delays.
The first folder starts open. Subsequent folders load on demand. Detail notes belong to the slot's
local input and reset on collapse unless **Keep detail notes** is enabled. Changing view or
virtual mode creates a new table instance.

Read [row expansion](/guide/expansion) for lifetime and HTML sanitization, and
[tree data](/guide/trees) for keyboard, selection, sorting and lazy-loading behavior.

## Source

<<< ../.vitepress/theme/components/HierarchyComponents.vue
