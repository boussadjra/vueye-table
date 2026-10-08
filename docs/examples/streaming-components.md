<script setup>
import StreamingRows from '../.vitepress/theme/components/StreamingRows.vue'
</script>

# Streaming tables and cursor pages

<StreamingRows />

This runnable example uses generated records and simulated delays. It switches between a live
feed and cursor pages, rendered as a full table or read-only grid. Queue a failure while loading,
then use **Retry loading**. For cursor pages, scroll near the end or use **Load more rows**.

```sh
pnpm docs:dev
# Open /examples/streaming-components
```

The [streaming guide](/guide/streaming#manage-a-source-in-vue) explains cancellation, SSR initial
data, cursor resets and frame scheduling. The complete example is in
[`StreamingRows.vue`](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/StreamingRows.vue).
