<script setup>
import FileExplorer from '../.vitepress/theme/components/FileExplorer.vue'
</script>

# File explorer

<FileExplorer />

`VueyeTable` loads simulated folder children on expansion and supports keyboard navigation,
loaded-descendant selection, retries and virtual rows. Folder sizes are precomputed by the
simulated service; the client does not infer totals from a partially loaded tree.

Run `pnpm docs:dev` and open `/examples/file-explorer`.
[FileExplorer.vue](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/FileExplorer.vue)
is the complete example. Read [tree data](/guide/trees) for lazy-cache ownership and cancellation.
