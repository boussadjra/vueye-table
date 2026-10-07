---
"@vueye-table/core": patch
"@vueye-table/vue": patch
"vueye-table": patch
---

Escape formula-like CSV/TSV cells and headers by default. This changes exported text beginning
with formula prefixes; pass `escapeFormulas: false` to retain literal output. Finite numeric
values formatted as numbers stay numeric. Clipboard copies keep their existing default and
accept `escapeFormulas: true` through table and grid bindings.

Reject prototype-sensitive column paths with `unsafe_path` issues, and copy only own
properties in path writes. Safe inherited getters remain readable. `setPath` leaves unsafe
writes unchanged and accepts an optional issue callback.

Bound paste parsing to the visible destination and `pasteLimit` budgets (100,000 fields and
5,000,000 UTF-16 code units by default). Excess input reports `paste_truncated`; incomplete
fields at the character limit are not applied. Invalid limits recover to defaults with
`invalid_paste_limit` issues.
