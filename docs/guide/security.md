# Security and content boundaries

Default cells and validation messages render as text. Core does not render HTML or depend on
a DOM. Custom slots are application code and can introduce different behavior.

| Library boundary                                                                                | Evidence                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default cells escape HTML-looking text; packages expose no raw-HTML API                         | [full-surface text rendering tests](https://github.com/boussadjra/vueye-table/blob/main/tests/vueye-table/vueye-table.test.ts), [repository boundary checks](https://github.com/boussadjra/vueye-table/blob/main/scripts/check-boundaries.mjs) |
| CSV/TSV export escapes formula-like text and headers by default; numeric negatives stay numeric | [content-boundary tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/content-boundaries.test.ts)                                                                                                                            |
| Unsafe prototype path segments are refused with `unsafe_path` issues                            | [column tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/columns.test.ts), [content-boundary tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/content-boundaries.test.ts)                            |
| Core enforces editor constraints for direct edits and pasted input                              | [validation tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/validation.test.ts)                                                                                                                                          |
| Paste work is bounded and truncated input is reported                                           | [content-boundary tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/content-boundaries.test.ts)                                                                                                                            |
| Edits and row operations do not mutate source data                                              | [editing tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/editing.test.ts), [row-operation tests](https://github.com/boussadjra/vueye-table/blob/main/tests/core/row-operations.test.ts)                                  |

## Application responsibilities

Revalidate values, authorize every affected record and tenant, check uniqueness and enforce
transactions on the server. Users can bypass UI constraints or fabricate `PendingChanges`.
Fetch only rows the caller may read. Bound and cancel transport work. A table filter is not
an access-control boundary.

Exports escape formula-like text by default. Clipboard copies preserve literal text unless
`escapeFormulas: true` is passed. Destination software can interpret content differently;
choose the option for that destination. See [migration notes](/guide/upgrading-from-2#export-and-paste-behavior-in-3-x-alpha).

## HTML in expanded details

Prefer text interpolation. If your application needs rich HTML, sanitize it on the server with
a maintained sanitizer and current DOM implementation. This is application code, not a table
dependency. The [expansion guide](/guide/expansion) includes the server sanitizer configuration
and DOMPurify's official server guidance. Return only that sanitized result; do not add
untrusted attributes or markup afterward.

```vue
<!-- sanitizedNotes comes from the server sanitizer in the expansion guide. -->
<VueyeTable :data="orders" :columns="columns" :row-can-expand="() => true">
  <template #expanded="{ row }">
    <section :aria-label="`Notes for order ${row.original.id}`">
      <div v-html="row.original.sanitizedNotes" />
    </section>
  </template>
</VueyeTable>
```

Allow only required tags and attributes. Keep links/media out of allowed content unless your
application validates them. Configure a Content Security Policy for your deployment as an
additional defense. Sanitization and CSP do not replace server authorization or validation.
Library checks establish the listed boundaries; they do not certify application slots,
sanitizers or deployments.
