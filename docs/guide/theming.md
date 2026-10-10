---
aside: false
---

<script setup lang="ts">
import ThemePlayground from "../.vitepress/theme/components/ThemePlayground.vue";
</script>

# Theming

The styled layer draws every color, size, and radius from CSS custom properties on `.vt-surface`
(the table's frame) and `.vt-theme` (controls placed outside it). A theme is a handful of
overrides, with no build step and no JavaScript.

<ThemePlayground />

## Custom properties

| Property                     | Controls                                                  |
| ---------------------------- | --------------------------------------------------------- |
| `--vt-font`                  | Font family. Inherits the page's by default.              |
| `--vt-font-size`             | Base font size, `0.875rem` by default.                    |
| `--vt-bg`                    | Surface background.                                       |
| `--vt-fg`                    | Text.                                                     |
| `--vt-muted`                 | Secondary text: headers, status, empty state.             |
| `--vt-border`                | Borders and row separators.                               |
| `--vt-header-bg`             | Header row background.                                    |
| `--vt-stripe`                | Every other row with `striped`.                           |
| `--vt-hover`                 | Row under the pointer with `hover`.                       |
| `--vt-accent`                | Sort indicators, checkboxes, the current page, progress.  |
| `--vt-accent-fg`             | Text on the accent.                                       |
| `--vt-selected`              | Selected rows.                                            |
| `--vt-range`                 | Selected cells of a spreadsheet range.                    |
| `--vt-focus`                 | Focus rings and the active spreadsheet cell.              |
| `--vt-danger`                | Error color for your own messages, such as refused edits. |
| `--vt-radius`                | Surface corners.                                          |
| `--vt-control-radius`        | Buttons, inputs, and menus.                               |
| `--vt-cell-x`, `--vt-cell-y` | Cell padding. Density sets both.                          |
| `--vt-shadow`                | Menus.                                                    |
| `--vt-max-height`            | Scroll height of the body. `max-height` sets it.          |

## Light and dark

Dark colors apply under `prefers-color-scheme: dark`. `theme="light"` or `theme="dark"` forces one
on a component, which writes `data-vt-theme` on its surface.

The theme's own defaults sit at zero specificity, on the outermost themed element only: any rule
of yours that sets a token wins, and toolbars, menus and footers inside a table inherit the table's
tokens rather than declaring their own.

When a site has its own switch, usually a `dark` class on `<html>`, give the table
`theme="inherit"`: it then declares no colors at all, ignores the operating system, and takes the
tokens the page declares, in the page's own light and dark themes:

```css
:root {
  --vt-bg: #ffffff;
  --vt-fg: #14121c;
  --vt-border: #e7e3ef;
  --vt-accent: #8a24c9;
}

:root.dark {
  --vt-bg: #0f0e18;
  --vt-fg: #edecf6;
  --vt-border: #232132;
  --vt-accent: #9333ea;
}
```

A design system can point the tokens at its own variables, `--vt-bg: var(--app-surface)`, so a
table follows every palette the application offers. Sizes (`--vt-radius`, `--vt-cell-x`, …) keep
their defaults under `inherit` unless you set them on the table, `.vt-surface { --vt-radius: 4px }`.

Choosing the colors in CSS rather than in a prop also keeps server-rendered pages free of a flash
or a hydration mismatch, since the server does not know the reader's theme.

## Right to left

The theme uses logical properties throughout, so `dir="rtl"` on the table or an ancestor lays it
out right to left: the expand chevron of a collapsed row points left, the loading bar runs right
to left, and in a spreadsheet or a tree the arrow keys follow what the reader sees (ArrowLeft moves
to the next column and expands a row).

## Density and surface options

| Prop            | Values                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| `density`       | `compact`, `comfortable` (default), `spacious`                          |
| `striped`       | Shade every other row.                                                  |
| `bordered`      | Draw lines between columns.                                             |
| `hover`         | Shade the row under the pointer. On by default.                         |
| `sticky-header` | Keep the header in view while the body scrolls. Pair with `max-height`. |
| `max-height`    | A CSS height, such as `"28rem"`, that makes the body scroll.            |

## Styling by state

Headless components describe their state in `data-*` attributes, and the styled layer uses the
same ones. Target them to restyle a detail without replacing a component:

| Attribute                                 | On                                    |
| ----------------------------------------- | ------------------------------------- |
| `data-sort="asc"` / `"desc"`              | Sorted header cells and sort buttons. |
| `data-selected`                           | Selected rows and spreadsheet cells.  |
| `data-focused`                            | The active spreadsheet cell.          |
| `data-editing`                            | The spreadsheet cell being edited.    |
| `data-readonly`                           | Spreadsheet cells that refuse edits.  |
| `data-column="<id>"`                      | Header and body cells of a column.    |
| `data-align="start" \| "center" \| "end"` | Header and body cells.                |
| `data-current`                            | The current page button.              |
| `data-empty`                              | The empty-state row.                  |

```css
/* Highlight the sorted column's header. */
.vt-table th[data-sort] {
  color: var(--vt-accent);
}

/* Right-align and dim a column by id. */
.vt-table td[data-column="sku"] {
  font-family: ui-monospace, monospace;
  color: var(--vt-muted);
}
```

## Without the styled layer

The headless components ship no CSS at all. Style them with your own classes, Tailwind, or any
design system, and use the `data-*` attributes above for state. The
[CRM contacts example](/examples/crm-contacts) builds a complete screen that way.
