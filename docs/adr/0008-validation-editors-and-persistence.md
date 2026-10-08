# ADR 0008: Validation, editors and persistence

- Status: Accepted
- Date: 2026-10-08
- Scope: core, Vue bindings and editing components
- Amends: [ADR 0003](/adr/0003-editing-and-spreadsheets)

## Decision

Core validates values independently of the rendered editor. `ColumnDef.validate` receives the
parsed value and row; `validateRow` receives proposed and previous rows. Editor metadata
describes controls and inclusive constraints, never HTML or authorization policy.
Validation failures are plain `TableIssue` records. Async batches expose a completion promise;
superseded drafts and sources fence late results.

User edits and row operations produce immutable data, undo records and changes relative to
the saved baseline. Source ingestion creates neither user undo steps nor persistence requests.
Dirty/pending ingestion conflicts are reported. Stable keys cannot be edited.

`getPendingChanges()` returns inserted, updated and removed records. Applications authorize
and revalidate them on the server, persist them, then call `markSaved` for acknowledged keys.
They must guard concurrent edits during requests so newer unsent values are not acknowledged.
`revert` restores the tracked baseline as an undoable operation.

Vue row drafts buffer fields without mutating sources. Full components supply typed editors
and editor slots. Save row commits a local draft; it does not save to a backend.

## Detailed contracts and consequences

This consolidates the roadmap's validation/persistence boundary without introducing another API.
Exact contracts remain in [ADR 0012](/adr/0012-validation-and-row-operations),
[ADR 0014](/adr/0014-vue-row-drafts-and-editor-metadata) and
[ADR 0017](/adr/0017-inline-and-typed-editors). Schema adapters, transport cancellation and
database transactions belong to the application. See [validation](/guide/validation) and
[security](/guide/security).
