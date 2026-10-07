# 0014 — Vue row drafts and editor metadata

Status: accepted. Implements #84, extending ADRs 0011 and 0012. Component forms and editor rendering remain with #85/#86.

## Decision

`useDataTable` retains one engine subscription and a shallow snapshot. `expanded`, `pendingChanges`, and the existing `pendingCells` are plain reactive accessors. Controlled expansion uses the existing `state` getter/ref and `onStateChange` pair; outside writes go through `setState`. A component wrapper can use that pair for `v-model:expanded`.

Vue supplies a native `AbortController` by default for `loadChildren`. Its callback receives an inferred `AbortSignal`. The engine still owns cancellation on collapse, replacement and destruction, and Vue scope disposal destroys the engine. Core retains its injected platform-independent controller contract. Custom signal types require a compatible factory unless a native signal satisfies their type.

`editRow(key)` copies the configured editable column values from one row into a `shallowReactive` bag. Path keys, including dotted paths, are typed using `DeepKeys`/`PathValue`; keys are optional because configured columns are a subset of row paths. Computed column ids use `setValue(id, value)`. No per-row watchers or dataset proxies are introduced. Structured values are copied with the runtime's `structuredClone`; nested copies are owned but not reactive. Uncopyable values report `invalid_value` and require an explicit replacement.

Changed strings and `setInput` text use core parsing. Other typed values use value edits. Saving submits one `edit` batch, runs cell and row validation, and resolves with its final `EditResult`. Success or partial application closes the draft; a completely rejected current draft can be corrected. Cancellation discards an unsubmitted draft. Once submitted, validation belongs to the engine and `cancel()` returns false. Disposal closes active drafts and resolves pending saves as rejected, even if application validators never settle.

Core adds optional `EditOptions.expectedRows`, copying the row identity expectations at submission and checking them before parsing and at async settlement. Vue drafts and grid commits use this check. An unrelated change to a guarded row makes the batch stale; optimistic guarded cells roll back without changing newer cells. Existing unguarded edits retain cell-level superseding. `EditResult.completion` exists on pending edits and resolves with their final outcome; superseded cells add `stale_draft` to that completion, without publishing old-cell issues into newer snapshots. Application-owned validator side effects remain uncancelled.

Drafts survive sorting, paging, expansion and unrelated source updates because they address stable row keys. Replacing/removing their row or changing a captured column definition rejects a subsequent save. Incoming updates to already dirty/pending rows retain the existing `ingestion_conflict` policy. This contract requires stable keys and immutable source updates.

The grid keeps its public `{ position, draft }` editor shape while privately retaining row key, original row and column identity. Reordering rows/columns moves the active editor and focus to that cell. A changed or invisible cell ends the editor with a stale issue. Grid `lastResult` follows async completion only while it remains the latest operation.

`editorFor(position)` returns a frozen `EditorSpec` for an editable cell, inferring text/number/checkbox/date when absent. It copies known metadata fields and primitive option values. Invalid runtime metadata falls back to text and reports `invalid_value` through `lastResult` once per column definition; repeated render-time lookups do not publish repeated results. There is no component registry, HTML rendering or string evaluation.

## Consequences

Forms can await validation and inspect field issues without adding refs to the public surface. Accepted fields in a partial save already changed the row, so callers open a fresh draft rather than replaying the old one. Nested draft edits become reactive when the cell value is replaced; this intentionally remains shallow. Draft saves update local table data and pending changes; persistence and authoritative validation belong to the application.

The runnable Vue example covers drafts, source updates, keyed grid edits and native scope cancellation without a DOM. Tests also cover controlled 10k-row expansion, tree virtualization anchoring, stale validation, immutability and safe metadata. These checks describe the provisional alpha API, not production readiness.
