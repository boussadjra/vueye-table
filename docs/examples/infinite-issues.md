<script setup>
import InfiniteIssues from '../.vitepress/theme/components/InfiniteIssues.vue'
</script>

# Infinite issue tracker

<InfiniteIssues />

This example reuses the [paged issue tracker's](/examples/server-side) simulated 10,000-record API.
`loadMore` translates an opaque cursor into that API's page number. The service handles search
and sorting; the table renders the received window. Search or sort cancels the previous query
and starts at page one. Errors keep received rows and expose retry controls.

Run `pnpm docs:dev` and open `/examples/infinite-issues`.
[InfiniteIssues.vue](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/InfiniteIssues.vue)
contains the complete adapter. See [cursor loading](/guide/streaming#manage-a-source-in-vue).
