# 0020: Beta API contract

Status: Accepted

## Context

The warehouse consumer exercised the six published packages together and found defects in row
menus, rendered column coordinates and reactive tree filtering. Beta needs a recorded public
contract so later fixes can be reviewed against the behavior applications depend on.

## Decision

Use the documented exports of the six layers as the 3.0 beta contract. Preserve their import
paths, option names, event payloads, slot scopes and immutable edit/persistence semantics across
the beta line. Keep the layer graph in ADR 0001 and the contracts in ADRs 0002–0019. Additive
changes remain possible with documentation, runnable examples and a changeset. Any necessary
breaking change needs an ADR, explicit migration steps and a new beta version.

Data editing coordinates remain zero-based and refer to visible data columns. Accessible counts
and one-based indices describe all rendered columns, including leading utility cells. The
`leadingColumns` option does not change editing coordinates. Tree filtering can change through
`setTreeFilter` or reactive Vue options while preserving loaded children, selection and edits.

The first requested beta is `3.0.0-beta.1`, published in lockstep to the npm `beta` channel.
GitHub marks it as a prerelease. Published-package consumer checks remain separate from checks
against locally packed archives; package provenance and exact versions must be verified after
publication. Beta does not establish production readiness or screen-reader/device acceptance.

## Consequences

The [beta guide](/guide/beta) and [2.x migration guide](/guide/upgrading-from-2) are the application
entry points. Compatibility fixes get regression tests and changesets. Release notes name any
remaining acceptance limits rather than implying they were tested.
