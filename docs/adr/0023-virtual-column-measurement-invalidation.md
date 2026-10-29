# ADR 0023: Virtual column measurement invalidation

- Status: Accepted
- Date: 2026-10-29
- Scope: `@vueye-table/core`, `@vueye-table/vue`

## Context

Keyed measurements survive layout reconfiguration (ADR 0005 and ADR 0010). A cached column
measurement therefore masks a new width from `state.columnSizing`, even when an estimate callback
reads the effective width. A renderer that sizes cells from virtual items keeps drawing the old
width and cannot rely on an observer to correct it.

## Decision

`Virtualizer.setOptions(options, resetMeasurements?)` accepts an optional array of keys to forget
before rebuilding layout. Clearing these measurements and applying the new estimates publishes
one consistent layout. Other measurements, including those for temporarily absent keys, survive.
Calling `setOptions` without the array retains its existing behavior.

`useVirtualColumns` prefers the effective column width over the configured estimate. It tracks
widths by column id and discards the measurements of columns whose width changed, including
changes observed when a hidden column returns. Resetting to an unspecified width uses the
configured estimate again. Existing scroll anchoring and subsequent element measurements remain
in effect. Row measurements remain unchanged.

## Consequences

Core remains independent of columns and Vue. Renderers can explicitly invalidate stale
measurements without replacing their virtualizer or changing stable item keys. This narrows
ADR 0010's lifetime retention rule for columns whose effective width changed.
