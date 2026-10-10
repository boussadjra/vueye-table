# 0021: Host language, text folding and themes

Status: Accepted

## Context

An application in Arabic and French could not ship the styled table: every word was English and
hard-coded, numbers were written in the runtime's locale or not at all ("1–50 of 1000"), text
ordered by the runtime's collation, and search compared lowercase text only, so `احمد` did not
find `أحمد` nor `benali` `Bénali`. A host theme also had to out-rank the library: dark colors came
from `prefers-color-scheme` at specificity 0,2,0, and toolbars re-declared every token, so a
host's override on the table surface never reached its search, pagination or column menu. A custom
`header.<id>` slot replaced the sort button, losing click-to-sort. Arrow keys did not mirror right
to left.

## Decision

- **Messages.** `TableMessages` (core) names every word the components show or announce, with
  functions for those that carry a number (`Count`: value and locale text) or a name. Hosts pass a
  partial set through a component's `messages` prop or `VueyeTablePlugin`'s options; the vue layer
  provides it (`provideTableLocale`, `useTableLocale`) and every headless and styled component reads
  it, a component's own `label` prop still winning. Defaults stay English.
- **Locale.** `locale` (engine option and component prop) writes counts with `Intl.NumberFormat`
  and orders text with `Intl.Collator`. Ordering reads it at creation, like `rowKey`.
- **Folding.** `normalizeText` (engine option and prop) reads search terms, cell text and text
  filters before comparing. The default `foldText` drops case, accents and Arabic marks and reads
  each Arabic letter in one shape. `filterRows` takes it too, so a server can match.
- **Themes.** Token defaults sit under `:where()` on the outermost themed element only; nested
  parts inherit. `theme="inherit"` declares no colors, for hosts that theme by class.
- **Header slot.** `header.<id>` fills the sort button of a sortable column and receives
  `{ column, sort, toggleSort }`, as the 2.x migration guide promised.
- **Direction.** `GridKey.direction` mirrors the arrow keys; components read it from the nearest
  `dir` attribute. CSS mirrors the collapsed-row chevron and the loading bar.

## Consequences

Defaults change slightly: row checkboxes read "Select row 3", the status says "1 row" and writes
"10,000", and search ignores accents. A host that relied on accent-sensitive search passes
`normalizeText: (text) => text.toLowerCase()`. A `header.<id>` slot that drew its own sort control
can call `toggleSort` and stop the click's propagation. Host CSS that out-ranked the old rules
keeps working.
