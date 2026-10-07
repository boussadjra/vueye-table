# Virtual rows and columns

This example uses 20,000 sample rows and 24 sample columns. Only the nearby rows and columns are rendered. Focus the last cell to jump to the far corner, then use the arrow keys inside the grid.

<script setup>
import VirtualGrid from '../.vitepress/theme/components/VirtualGrid.vue'
</script>

<div class="vp-raw"><VirtualGrid /></div>

## Build it

<<< ../.vitepress/theme/components/VirtualGrid.vue

The example supplies its own grid markup and fixed row sizes. See the [virtualization guide](/guide/virtualization#vue-composables) for variable measurements, expansion details and SSR. Existing styled components gain virtualization separately in #72.
