<script setup>
import LiveLogs from '../.vitepress/theme/components/LiveLogs.vue'
</script>

# Live NDJSON logs

<LiveLogs />

The application decodes UTF-8 and frames newline-delimited JSON before passing records to
`table.stream`. Start the generated feed, stop it partway, then restart. Status and received
counts come from the reactive snapshot. `useDataTable` owns the engine lifecycle; `VtTable`
provides the virtual styled view. No HTTP endpoint is required.

Run `pnpm docs:dev` and open `/examples/live-logs`. The transport and parser are in
[`source.ts`](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/examples/live-logs/source.ts);
the view is [LiveLogs.vue](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/LiveLogs.vue).
See [streams and cancellation](/guide/streaming).
