---
"@vueye-table/core": minor
"@vueye-table/vue": patch
---

Keep virtual column sizes in sync with effective column widths after resizing, resetting,
controlled state updates, and column definition changes. Discard only measurements whose column
width changed, including changes made while hidden, and preserve other measurements and scroll
anchoring. Explicit widths take precedence over the column estimate.

The core virtualizer's `setOptions` accepts an optional second array of keys whose cached
measurements should be discarded while reconfiguring layout.
