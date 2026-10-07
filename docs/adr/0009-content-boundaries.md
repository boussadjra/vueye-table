# ADR 0009: Export, path, and paste boundaries

- Status: Accepted
- Date: 2026-10-07
- Scope: `@vueye-table/core`, `@vueye-table/vue`, `vueye-table`

## Decision

### Escape formula-like export text by default

`ExportOptions.escapeFormulas` defaults to `true` for CSV and TSV, including column headers.
Prefix text beginning with `=`, `+`, `-`, `@`, tab, carriage return, line feed, or full-width
formula prefixes with an apostrophe before delimited quoting. This is an export behavior
change and requires a changeset and an upgrade note.

Only finite numeric values whose display is a decimal/exponent numeric literal are exempt.
Numeric-looking strings are still escaped; numeric values with formula-like custom formatting
are also escaped. The engine's values and rendered text are unchanged. The raw
`toDelimited` helper stays a general serializer.

`CopyOptions.escapeFormulas` defaults to `false` on `table.copy(range, options)` and
`grid.copy(options)`, preserving clipboard round trips. Callers can explicitly opt into
escaping for copies or opt out for exports.

The apostrophe strategy follows the requested text-preserving mitigation, not a universal
spreadsheet sandbox. Consumers must account for their spreadsheet's handling of imported
and re-saved files; [OWASP documents those differences](https://owasp.org/www-community/attacks/CSV_Injection).

### Refuse prototype-sensitive paths before invoking callbacks

Every dotted segment is checked before reading or writing. `__proto__`, `constructor`, and
`prototype` are refused even when they are own data properties. `getPath` returns
`undefined`; `setPath` returns its original input unchanged and optionally reports an
`unsafe_path` issue through its fourth argument. This preserves its copy-on-write return
type and adds an issue channel without throwing.

Safe paths retain inherited getters for compatibility with row classes. Writes copy only own
enumerable properties along the path and create missing steps as plain objects. Existing own prototype-named data can be
copied without assigning through its prototype setter.

The table ignores unsafe column definitions and reports them in snapshot issues on initial
resolution and after `setColumns`. Unsafe edits report `unsafe_path` through the existing
edit result and callback. A resolved unsafe column cannot invoke its accessor or setter.
Developer-provided callbacks on safe column ids remain responsible for their own writes.

### Bound paste work and apply only complete cells

`TableOptions.pasteLimit` accepts `maxCells` (default 100,000 fields) and `maxLength`
(default 5,000,000 UTF-16 code units). Positive safe integers are required; invalid values
recover to defaults and produce `invalid_paste_limit` snapshot issues. Limits are read once
with the table options and flow through `useDataTable`.

The internal bounded reader stops at the visible destination, field budget, or character
budget. It skips clipped columns without retaining their content, preserving quoted-field
and following-row alignment; skipped fields still consume the field budget. It stops as
soon as the last destination cell is complete. Parsing cost is bounded by the configured
character budget, while retained cells are bounded by the destination and field budget.

An incomplete field at the character cutoff is never applied. Excess input reports one
`paste_truncated` issue alongside cell refusals through the existing edit result and
`onEditIssues`. Complete changes remain one notification and one undo batch. A trailing
newline alone is not truncation. `parseDelimited` retains its standalone matrix API.

Pastes still fill from the origin to the grid edges; changing the meaning of a selected
range is outside this decision. Rendering restrictions remain part of the component work.
