---
"@vueye-table/core": patch
"@vueye-table/vue": patch
"vueye-table": patch
---

Apply treeFilter changes after mounting VueyeTable and VueyeGrid without replacing the engine or clearing loaded children, edits, selection or expansion. Core exposes setTreeFilter(mode), and useDataTable accepts a ref or getter for treeFilter.
