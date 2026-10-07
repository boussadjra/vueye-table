# Streaming source

This runnable core example consumes three rows in chunks, prints progress, protects a local edit from an incoming update, keeps received rows through undo, and checks cancellation. It runs without a browser or transport service.

From the repository root, using the supported Node runtime:

```sh
pnpm --filter @vueye-table/core build
pnpm example:streaming
```

Successful output includes:

```text
loading: 0/3 rows
streaming: 2/3 rows
streaming: 3/3 rows
done: 3/3 rows
Incoming update: ingestion_conflict; local quantity: 5
After undo: quantity 2; 4 source rows retained
Pre-aborted source: aborted
```

Additional progress lines accompany edit and source operations. The script checks its results and exits with an error if ingestion, undo retention or cancellation fails.

::: details Runnable example source
<<< ../../examples/streaming.ts
:::

See [Incremental data and streams](/guide/streaming) for source contracts, conflicts, manual cursor accumulation, readonly arrays and performance boundaries. This example uses simulated rows; HTTP/SSE/WebSocket adapters and infinite-scroll component behavior remain follow-up work.
