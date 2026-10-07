# Row drafts in Vue

This runnable example edits an order's status and quantity as one validated batch, receives an unrelated source update, undoes both fields together, refuses a stale draft, keeps a grid edit on its keyed row during sorting, and aborts a lazy request when its Vue scope ends. It runs without a DOM or a transport service.

From the repository root with the supported Node runtime:

```sh
pnpm --filter @vueye-table/core build
pnpm --filter @vueye-table/vue build
pnpm example:row-drafts
```

Expected output:

```text
Draft pending: true; pending cells: 2
Saved draft: applied; changed rows: 1
One undo restored both fields.
Stale draft: stale_draft
Grid edit stayed on row 1: 6
Scope cleanup aborted the native lazy-load signal.
```

The script checks every outcome and exits with an error on failure. Async validation and received rows are simulated; no data is persisted remotely.

::: details Runnable example source
<<< ../../examples/row-drafts.ts
:::

Read [Vue row drafts](/guide/row-drafts) for typing, field issues, lifecycle and grid metadata, [tree data](/guide/trees) for disclosure/cancellation, and [streaming](/guide/streaming) for source conflicts.
