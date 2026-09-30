---
aside: false
---

<script setup lang="ts">
import ExampleGallery from "../.vitepress/theme/components/ExampleGallery.vue";
</script>

# Examples

Screens you would build at work, each running live on its page with the source that makes it. They
use every layer: the complete `<VueyeTable>` and `<VueyeGrid>`, the styled pieces, the headless
components, and the composables alone.

<ExampleGallery />

Every example keeps its data in the page and never changes the array it was given. Edits, bulk
actions, and favorites all produce new arrays, which is what makes undo, `v-model:data`, and a
server save straightforward.
