# Virtual rows and columns

This example uses 20,000 sample rows and 24 sample columns. Both pinned edges stay rendered while
the centre columns scroll. Widen the first column or unpin the edges to see the available centre
width update. Group by team and collapse a header to try independently measured group rows.
Focus the last cell to jump to the far corner, then use the arrow keys inside the grid.

<script setup>
import VirtualGrid from '../.vitepress/theme/components/VirtualGrid.vue'
</script>

<div class="vp-raw"><VirtualGrid /></div>

## Build it

<<< ../.vitepress/theme/components/VirtualGrid.vue

The example supplies its own grid markup and fixed row sizes. See the [virtualization guide](/guide/virtualization#vue-composables) for variable measurements, expansion details and SSR, or the [full component example](/examples/virtual-components) for virtualization through props.
