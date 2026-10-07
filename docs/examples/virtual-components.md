# Virtual table and spreadsheet

Use the full components over 100,000 generated sample records. The spreadsheet windows both axes; the data table keeps search, sorting and selection. Keyboard navigation and editing use the same logical rows even when most rows are outside the viewport.

<script setup>
import VirtualComponents from '../.vitepress/theme/components/VirtualComponents.vue'
</script>

<div class="vp-raw"><VirtualComponents /></div>

## Add the props

```vue
<VueyeTable :data="rows" :columns="columns" virtual height="280px" :row-height="40" />
<VueyeGrid v-model:data="rows" :columns="columns" virtual virtual-columns height="280px" />
```

The grid accepts arrows, Page Up/Down, Ctrl or Command + Home/End, Enter, undo/redo and clipboard actions. Account and Amount are editable in this sample; its derived metrics are read-only. Changing a value produces a new source array.

Virtual tables default to no pagination. Use `paginate` to virtualize a large page explicitly. `height` controls the viewport; `row-height` is the initial estimate and rendered rows are measured. See the [component contracts](/guide/virtualization#component-props), [ADR 0013](/adr/0013-component-virtualization) and the [runnable source](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/VirtualComponents.vue).

Run `pnpm docs:dev` and open this route to try it locally. The earlier [composable example](/examples/virtual-grid) remains available for custom layouts.
