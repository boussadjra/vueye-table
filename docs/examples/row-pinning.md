---
aside: false
---

<script setup lang="ts">
import RowPinning from "../.vitepress/theme/components/RowPinning.vue";
</script>

# Keep reference rows in view

Illustrative inventory demonstrates rows pinned above and below a paginated centre. Search,
sort or change pages: the pin regions keep their key order. Moving a row between regions updates
the centre count and grid coordinates. Refreshing a source record updates its pinned snapshot;
removing a pinned record prunes its key with an issue.

<RowPinning />

The example renders `topRows`, `rows` and `bottomRows` as three table bodies. `gridRows` supplies
the visual coordinate space for `useDataGrid`, clipboard operations and focus. Sticky styles are
owned by the example; built-in pinned-row components remain follow-up work.

See [row pinning](/guide/row-pinning) for filter behaviour, manual-page supply and migration,
and [ADR 0026](/adr/0026-row-pinning) for the complete contract.
