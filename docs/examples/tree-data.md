# Project files

Explore sample folders and files. Search for **Logo** to reveal its ancestors, select **Design** to include its loaded descendants, or rename a child and undo the edit. Each page holds two complete root folders. **Archive** loads sample children after a short delay; closing it cancels the load.

<script setup>
import TreeData from '../.vitepress/theme/components/TreeData.vue'
</script>

<div class="vp-raw"><TreeData /></div>

## Build it

<<< ../.vitepress/theme/components/TreeData.vue

The example supplies its own disclosure buttons and indentation. The [tree guide](/guide/trees) covers flat parent keys, filtering modes, cancellation, editing and export. Arrow-key tree navigation and styled tree controls remain separate follow-up work.
