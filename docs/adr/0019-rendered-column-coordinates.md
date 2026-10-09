# ADR 0019: Rendered column coordinates

Status: accepted. Fixes #111; extends ADRs 0004 and 0013.

## Decision

Accessible column coordinates describe the complete rendered table: leading utility cells
plus visible data columns. Counts include utility columns; each header and data cell has a
one-based index that includes the utility offset. Virtual spacer cells remain hidden from
accessibility. Hidden data columns are excluded, and reordered columns use display order.

`DataTableRoot`, `DataGridRoot` and `VtTable` accept `leadingColumns` (default zero).
Custom compositions provide the number of leading utility columns and index their own
utility cells from one. Full components calculate this count: a table can have separate
actions, details and selection columns; a grid combines row numbers, details and actions
in one row-header column. The grid's row-number header has an accessible label.

## Consequences

Core column definitions and spreadsheet editing coordinates continue to address only data
columns. Cell IDs, keyboard navigation and editor positions keep their existing zero-based
coordinates. Assistive technology receives the full rendered column count and position,
even when horizontal virtualization omits offscreen data cells.
