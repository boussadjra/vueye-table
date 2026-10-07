# Order details

These three orders use sample data. Expand an order to see its items, then change pages. Details stay attached to their order and the pagination count stays at three orders.

<script setup>
import RowExpansion from '../.vitepress/theme/components/RowExpansion.vue'
</script>

<div class="vp-raw"><RowExpansion /></div>

## Build it

<<< ../.vitepress/theme/components/RowExpansion.vue

Set `expandMode: 'single'` when only one detail should stay open. Read the [expansion guide](/guide/expansion) for state rules and the render-item contract. This example supplies its own detail renderer.
