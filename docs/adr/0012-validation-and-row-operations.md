# 0012 — Validation, row operations, and saved baselines

Status: accepted. Implements issue #82 and extends ADR 0003 without mutating input or storing component drafts in core state.

## Decision

Column `validate(value, row)` runs after parsing and editor constraints, only for changed cells. `validateRow(next, previous)` receives one accepted draft per affected row per batch; a failed row refuses its accepted cells while other rows can apply. Validation returns `true`, a plain text message, or `{ message, code? }`. Core catches thrown/rejected validators. Direct Standard Schema acceptance is deferred; callers can wrap their schema in a validator without a vendor dependency.

`EditorSpec` is serializable metadata. Core enforces maximum length, finite inclusive numeric/date bounds, option membership, and a Unicode pattern during both typed/value edits and paste. Validators, metadata, values and messages have no HTML rendering contract. Client checks complement server validation.

`edit`, `paste` and `clear` remain synchronous. An async batch returns `pending`; the snapshot exposes its pending cells. All promises in a batch settle together, followed by one snapshot and one `onEditIssues` call. Application defaults to held; `asyncValidation: "optimistic"` applies the draft and rolls rejected live cells back. A new edit supersedes that cell's validation; with a row validator it supersedes the row's older validation, preserving cross-field correctness. Foreign data, new columns, removal, undo/redo and disposal fence late results. Application-owned validator side effects are not cancelled by core.

`insertRows(rows?, { before?, parent? })` and `removeRows(keys)` each form one undo step and publish a new array. Calling `insertRows()` uses `createRow`. Keys must be stable (an explicit `rowKey`, or ids on all rows); editing a key is refused. Inserts reject new key/cycle/depth/orphan problems atomically. Removing a tree row removes its loaded subtree. Nested child operations need `setChildren`; adjacency insertion uses `setParentKey` or input already addressed to that parent. An arbitrary parent getter has no inferable inverse. Lazy parents must finish loading before insertion. Lazy adjacency changes remain in the table-owned cache and are exposed as row changes for caller persistence.

`getPendingChanges()` returns frozen inserted, updated and removed records from a maintained map of touched keys. Updated records include the saved row and earliest previous cell values. A row's `isDirty` is a map lookup; pending changes do not depend on search, sort or pages. Insert-then-remove cancels the insertion. Removing an edited row keeps its saved baseline; removed nested baselines exclude unsaved inserted descendants.

`markSaved(keys?)` advances the baseline only for acknowledged rows and does not clear undo. `revert(keys?)` restores tracked saved values and rows as one undoable batch; it uses trusted historical values without rerunning validators. Restore a removed parent before reverting a child alone. A foreign `setData` clears pending changes/history; passing back the exact engine-produced array preserves both, including Vue's raw-array round trip. Partial server success should mark only acknowledged keys.

## Consequences

Rows expose immutable `cellIssues`; snapshot metadata remains a view of that revision. The Vue binding forwards the new core operations, while component editor choice, row draft forms, focus and async UI integration remain with #84/#86. Saving, authorization and authoritative validation remain application/server responsibilities. Benchmarks measure synchronous 10k-cell paste separately from UI and network work.
