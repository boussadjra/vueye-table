# 0028 — Component resizing and pinned columns

Status: accepted for the next beta.

## Decision

Resize UI is opt-in with `resizableColumns` (default false) on headless, styled and full roots.
`DataTableHeaderCell` supplies its column to `DataTableColumnResizer` and appends a handle for
enabled resizable columns, including custom header content. Separators expose orientation,
current/minimum/optional maximum width and localized names/instructions from `TableMessages`.
Arrow keys change by 10px, Shift by 50px, Home uses the positive minimum, End uses a defined
maximum, and Enter/double-click resets. The host's nearest `dir` controls horizontal direction.

A captured pointer gesture changes CSS custom properties on the table, not engine state.
Colgroup widths, total width and dependent sticky offsets read the same properties. Release
commits one named resize operation; unchanged gestures remain no-ops. Pointer cancellation,
lost capture, Escape, column replacement or unmount discards a preview. No browser global or
global event listener is needed. Grid keyboard handling ignores controls inside the grid.

Resizable/pinned roots render a fixed native table with a colgroup. Ordinary roots retain their
previous layout. Undefined data widths use 120px constrained by limits; handles enforce a 1px
positive minimum. Custom header/body content stays text/VNode-based under ADR 0009.

Pinned cells use logical sticky insets and `data-pinned`/`data-pinned-edge`. Preview offsets sum
the same width variables as the colgroup. `DataTableLeadingCell` marks selection/disclosure,
action and row-number cells. Headless `leadingColumns` and optional `leadingColumnWidths`
(48px per unspecified entry) define their physical extent; grid `gutter` can supply the sum.
Full/styled components supply their utility widths. Utility cells stick with the start region
and contribute to data pin offsets. Raw custom utility cells require equivalent styles.

Native table/grid horizontal virtualization retains both pinned edges outside the centre slice.
Colgroup spacer geometry keeps full-surface widths and logical indices from ADR 0027. RTL scroll
is normalized to a positive logical centre offset. A leading scroll margin becomes a sticky
viewport inset while pins are active, rather than shifting the centre offset.

Styled handles and pin surfaces use `--vt-resizer-color`, `--vt-resizer-hover`, `--vt-pinned-bg`
and `--vt-pinned-shadow`, including inherited themes. Pin backgrounds are opaque; sticky headers
cover the body and pinned header corners cover both. Column visibility menus add localized
pin-to-start, pin-to-end and unpin choices without changing visibility.

`VueyeTable` and `VueyeGrid` expose `columnSizing`/`columnPinning` props and matching model emits.
Outside prop changes use controlled state without callback echoes. Group/pinned-row component
rendering remains #141; this decision does not change those render-item contracts.
