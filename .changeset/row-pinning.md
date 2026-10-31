---
"@vueye-table/core": minor
"@vueye-table/vue": minor
"@vueye-table/headless": patch
---

Add row pinning with top/bottom key arrays, `pinRow`, separate snapshot regions and a unified
`gridRows` visual coordinate space. Pins stay outside centre pagination; `keepPinnedRows`
controls filter visibility. Selection, clipboard, edits, drafts, streams and exports preserve
row identity across regions. Client stale keys are pruned with issues; manual tables retain
unresolved keys until the host supplies their records. Tree pins show alone at their depth.

Complete TableState literals must add `rowPinning: { top: [], bottom: [] }`. Partial patches
remain compatible. Custom renderers use topRows/rows/bottomRows and gridRows; built-in pinned-row
components remain follow-up work. In manual tables, rowCount is the server's centre total.
