---
"@vueye-table/core": minor
"@vueye-table/vue": minor
"@vueye-table/headless": minor
"@vueye-table/styled": minor
"vueye-table": minor
"@vueye-table/nuxt": patch
---

Let a host speak its own language and wear its own theme. Every word the components show or announce now comes from `TableMessages`, passed through a `messages` prop or `VueyeTablePlugin` options, with counts written in a `locale` that also orders text. Search and text filters read text through `normalizeText`, by default `foldText`, which ignores case, accents and Arabic letter shapes. Theme defaults sit at zero specificity on the outermost themed element so host tokens win and toolbars inherit them, and `theme="inherit"` declares no colors. A `header.<id>` slot now keeps click-to-sort and receives `{ column, sort, toggleSort }`. Arrow keys and the collapsed-row chevron mirror right to left. State `update:*` events are typed, `VueyeTableExposed` types the template ref, and the Nuxt module's declaration names its types.
