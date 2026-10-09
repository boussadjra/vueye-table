# Operations desk

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

vueye-table maintainers evaluating the published framework through a warehouse operations
workflow. The user confirmed this domain for the beta acceptance project.

## Product Purpose

Expose integration and interaction defects before the first 3.0 beta. Success means reproducible
failures become repository issues, their fixes reach published packages, and the same consumer
passes the recorded acceptance gates after its dependency pins are updated.

## Operating Context

A standalone Nuxt application with a local SQLite database, generated orders and stock, HTTP
cursor loading, transactional saves, lazy location branches and receiving streams. It installs
all six framework packages from npm rather than importing workspace source.

## Capabilities and Constraints

- Orders: search/sort 100,000 rows, append cursor pages, select and inspect details, recover from outages.
- Inventory: immutable spreadsheet edits, validation, undo/redo, insertion/deletion, CSV export and revision conflicts.
- Stress mode: 100,000 frozen rows and 24 columns; local edits have no persistence in this mode.
- Locations: lazy warehouse/aisle/bin loading, failure/retry and descendant selection.
- Receiving: streamed multilingual records, literal HTML-looking text, restart and cancellation.
- Local testing only: no authentication or production deployment configuration. All data is synthetic.
- Beta requires resolving the linked defects and completing the browser/API/release checklist.

## Evidence on Hand

`README.md` documents setup. `ACCEPTANCE.md` distinguishes passed, failed and unrun checks.
`tests/` exercises the published engine and SQLite boundaries. `scripts/http-acceptance.mjs`
starts a production-mode server with an isolated temporary database. The deliberate accessible
column reproducer remains separate from the passing verification command.

## Product Principles

- Test the packages a consumer actually installs.
- Keep caller data immutable and retain unsaved edits after a failed save.
- Make failures, recovery actions and pending work visible.
- Distinguish reproducible evidence from readiness claims.
