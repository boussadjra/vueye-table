# ADR 0004: Component layers, rendering, and theming

- Status: Accepted
- Date: 2026-09-27
- Scope: `@vueye-table/headless`, `@vueye-table/styled`, `vueye-table`

## Decision

### Render functions in TypeScript

Components are `defineComponent` render functions in `.ts` files. The component packages build
with `tsdown` like the engine, ship generated declarations, and need no single-file-component
compiler. Slots are declared with `SlotsType`, so slot props are typed for consumers.

These packages turn `isolatedDeclarations` off: component types are inferred by Vue and cannot be
written out by hand without duplicating them.

### Headless components describe, never decorate

Headless components render semantic elements with ARIA (`aria-sort`, `aria-selected`,
`aria-rowindex`, `aria-activedescendant`, a polite `role="status"` region) and expose state as
`data-*` attributes and slot props. Each accepts `as`. They read the table through injection and
throw a message naming the provider when there is none.

### No browser globals

Focus moves through template refs, clipboard access uses the event's `clipboardData`, and nothing
runs at module scope, so every component renders on a server.

### Theming through custom properties

`style.css` defines every color, size, radius, and spacing value as a custom property on
`.vt-surface` and `.vt-theme`. Dark values apply under `prefers-color-scheme` unless a surface is
forced light, and always under `data-vt-theme="dark"`. Density is a data attribute. Styles target
structure and data attributes inside `.vt-surface`, so headless markup is styled without extra
classes.

### Row-type variance

Components are not generic, so props that take a table or columns accept any row type
(`AnyDataTableBinding`, `AnyColumnDef`). Type safety lives where rows are declared: in
`defineColumns<Row>()` and `useDataTable<Row>()`.
