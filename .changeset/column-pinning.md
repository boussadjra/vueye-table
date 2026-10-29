---
"@vueye-table/core": minor
"@vueye-table/vue": minor
---

Add logical column pinning with `columnPinning` state, `pinned` and `pinnable` column options,
and `pinColumn(id, "start" | "end" | false)`. Snapshots expose effective pinned widths, offsets,
and boundary markers while preserving one display order for navigation, copy/paste and export.
Hidden pins take no width; resizing updates offsets without rerunning the row pipeline.
`moveColumn` clamps moves to the current pin region. Invalid pins recover with `TableIssue`s.

Complete `TableState` literals must add `columnPinning: { start: [], end: [] }`; patches remain
compatible. Vue forwards the operation and exposes the new snapshot fields. Built-in sticky
component rendering and centre-only horizontal virtualization remain follow-up work.
