<script setup lang="ts">
import InlineEditors from "../.vitepress/theme/components/InlineEditors.vue";
</script>

# Inline and typed editors

Compare cell editing, a row draft saved in one batch, and spreadsheet editing. Try the
simulated quantity refusal, custom status field, row actions and optional virtual rows.

<InlineEditors />

All items are generated local samples. The delayed quantity check simulates validation;
it does not contact a server. Mark saved advances the local baseline used by Revert row.
Switching editing view creates a new table instance and therefore a new baseline.

Read [editing and spreadsheets](/guide/editing) for the editor-slot contract and keyboard
behavior, [row drafts](/guide/row-drafts) for batch lifetime, and
[validation](/guide/validation) for core parsing and constraints.

## Source

<<< @/.vitepress/theme/components/InlineEditors.vue
