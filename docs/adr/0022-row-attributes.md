# 0022: Row attributes

Status: Accepted

## Context

A full component gave a page no way to put anything on a body row. `bodyRow` passed
`DataTableRow` only its own attributes, and there is no whole-row slot, so an application that
tinted a row by its state (an absent pupil in red, a late one in amber) or gave tests a row hook
had to hide a marker in a cell and reach the row with `tr:has(…)`. That put row state inside a cell,
where no keyboard or accessibility code sees it ([#127](https://github.com/boussadjra/vueye-table/issues/127)).

## Decision

- **One function.** `rowAttrs: (item, row) => RowAttributes | null | undefined` on `VueyeTable`,
  `VueyeGrid` and `VtGrid`, called on every render, so a row whose item changes takes new
  attributes on the same element.
- **What it may set.** A `class`, a `style`, and `data-*` and `aria-*` attributes. `rowAttributes`
  (headless) keeps those and leaves out everything else: event handlers, `key`, `ref`, `role`,
  `tabindex`, `id`. `row-click` stays the one row event.
- **The row's own win.** They are merged with `mergeProps` before the row's own attributes, so
  `data-key`, `data-selected`, `data-dirty`, `aria-rowindex`, `aria-selected`, tree attributes,
  focus and the virtual row's measuring ref always hold; `class` and `style` add to the row's.
- **Headless.** `DataTableRow` takes the filtered object as `attributes`; `DataGridBody` takes the
  function as `row-attrs`, since it draws its rows itself. Plain fallthrough attributes are not
  used: they would win over the row's own.

## Consequences

A page tints and tags rows without reaching into a cell, and selection, trees and virtual rows keep
working whatever it returns. Header and footer rows and cells stay out: `cell.<id>` slots cover
cells.
