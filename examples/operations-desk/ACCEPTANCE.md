# Beta acceptance matrix

Run against the built application, not only the development server. Record OS, Node, browser,
Nuxt, Vue and all six package versions. Start each persistence test with a known stock revision.

## Repeatable browser checks

1. **Orders:** wait for 100 rows. Load the next page and confirm the count grows without duplicates.
   Select an order and open its detail. Search `Atlas`, immediately replace it with `مكتبة الأفق`,
   then sort Value descending. Every returned row must belong to the last query. Search a missing
   reference for an empty state. Queue an outage, load another page and retry; existing rows remain.
2. **Inventory:** change `stock-1` quantity, check pending count, undo/redo, then save and reload.
   The new quantity persists and the revision increments. Paste `-1` into quantity and try a reserved
   quantity above on-hand stock; both must report an issue without changing the source. Enter an
   existing SKU, then a new one while its slow check is pending; the old response must not win.
3. **Conflict:** load stock in two tabs. Save a change to `stock-1` in tab A. Attempt to save tab B's
   old revision. The server returns 409 and tab B keeps its pending edits. Reload explicitly before
   retrying. Also edit while the one-second save is pending: the newer edit must remain pending.
4. **Row operations and export:** add a unique stock item, edit/save/reload it, remove it/save/reload,
   and undo an unsaved insertion/deletion. Enter `=1+1` in Product and export CSV; formula text is
   escaped. Copy/paste a mixed valid/invalid range and inspect both recovery issues and valid cells.
5. **Virtual stress:** choose Stress 100,000 rows. Focus the grid, Ctrl+End to its last row/column,
   Ctrl+Home back, edit the final quantity, move with Tab/PageUp/PageDown and extend ranges with
   Shift. Scroll while an editor is open. The focused cell remains mounted, input stays immutable,
   and the DOM contains a bounded window rather than 100k rows or all 24 columns.
6. **Locations:** expand Algiers and Aisle 1, select a parent, deselect one bin and inspect the mixed
   checkbox. Queue a branch outage and retry. Collapse while loading, navigate away and return.
   Search already-loaded bins with each context mode; inspect hierarchy and keyboard navigation.
7. **Receiving:** start 1k deliveries, verify exact final count and Arabic/accented text. HTML notes
   remain text. Start 10k, stop early, then check server connections: zero. Restart repeatedly and
   navigate away during a feed; no old feed may append to the new session. Test a failed connection.
8. **Presentation and SSR:** directly load all four routes. Inspect browser errors for hydration
   mismatches. Use keyboard only through navigation, search, editors and retry. Inspect desktop
   1440px and mobile 390px in light/dark modes: page chrome fits; wide tables scroll internally.

## Recorded run

2026-10-09: Windows, Node 24.18.0, pnpm 11.17.0, Nuxt 4.6.0, Vue 3.5.43, six npm packages
3.0.0-alpha.10. Browser interaction checks used the Codex Chromium browser.

| Check                                                                                                                                            | Result                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Strict Nuxt types, seven engine/SQLite tests, production build                                                                                   | Passed                                                                                                        |
| Four SSR HTTP routes, 100k cursor/search, 503 retry, persistent save, 409/422 rejection, lazy HTTP branches, 1k Unicode stream and abort cleanup | Passed against an isolated production server/database                                                         |
| Cursor append, rapid Arabic search, descending sort, detail/selection, outage/retry                                                              | Passed in Chromium                                                                                            |
| Edit, undo/redo, save/refetch, invalid quantity/row constraint, HTTP SKU rejection/recovery, partial paste                                       | Passed in Chromium                                                                                            |
| Stale revision after competing clerk and actual two-tab save                                                                                     | 409 observed; pending edit retained                                                                           |
| Newer edit during the one-second save                                                                                                            | Passed; newer edit remained pending after submitted batch saved                                               |
| Insert/save/refetch; keyboard deletion, undo/redo/save/refetch                                                                                   | Passed in Chromium                                                                                            |
| Downloaded CSV with Product `=1+1`                                                                                                               | Passed; 2,000 exported rows and formula escaped as `'=1+1`                                                    |
| 100k × 24 virtual grid, Ctrl+End/Home, final-row edit                                                                                            | Passed; observed 12 mounted data rows / 132 data cells at Ctrl+End, 9 / 81 at Ctrl+Home                       |
| Lazy failure/retry, warehouse/aisle/bin loading, mixed descendant selection                                                                      | Passed in Chromium                                                                                            |
| Tree roving focus and ArrowRight branch expansion                                                                                                | Passed; complete keyboard-only traversal remains pending                                                      |
| 1k receiving completion, multilingual/literal HTML notes, early 10k stop and connection check                                                    | Passed; stopped connection count zero                                                                         |
| Four routes at 1440px and 390px in light/dark, plus 1280px window; console inspection                                                            | Page chrome fits, wide data scrolls internally; no captured console errors/warnings                           |
| Accessible utility-column counts/indices                                                                                                         | Failed: [#111](https://github.com/boussadjra/vueye-table/issues/111)                                          |
| Pointer row removal in virtual grid                                                                                                              | Failed: [#112](https://github.com/boussadjra/vueye-table/issues/112); keyboard removal works                  |
| Changing the public treeFilter prop after mount                                                                                                  | Failed: [#113](https://github.com/boussadjra/vueye-table/issues/113); strict still displays context ancestors |

`node scripts/reproduce-column-semantics.mjs` is a deliberately failing regression reproducer for
#111. Both a two-column numbered grid and a selectable table report 2 accessible columns while
rendering 3 native columns. It is separate from the application's passing verification command.

Nuxt's Windows renderer fault was resolved in this app with the documented upstream workaround;
it is not attributed to vueye-table. Local 100k engine checks varied with machine load (roughly
0.3–1.2 seconds across runs); these observations are not a performance guarantee.

The consumer's missing CSV download handler was corrected. Receiving options are disabled during
an active session so the displayed total cannot drift from the count requested at its start.
Stop receiving before changing the delivery count or failure option, then start a new session.

Pending: Firefox/WebKit interaction runs, screen-reader acceptance, complete keyboard-only tree
navigation, retained editors while scrolling, and static/dynamic tree-filter mode coverage after
the prop-change defect is resolved. The HTTP suite proves version conflicts and abort cleanup;
it does not substitute for those remaining rendered interactions. Hosted Windows/Linux consumer
CI is pending the PR run.

Beta remains blocked on all three confirmed defects and the remaining acceptance/release checklist.

## Corrected package candidate

2026-10-09, `fix/warehouse-beta-blockers`: a separate copy of this app installed six locally
packed archives with dependency overrides for the complete group. The archives retain
alpha.10 version metadata but contain the candidate fixes; they are **unpublished** and do
not replace the recorded npm alpha.10 run above or the required published-alpha retest.

- Root `pnpm check` passed: 427 tests with coverage, strict types, docs/playground/package
  builds, boundaries and all six package export checks.
- Candidate `pnpm verify` passed (strict Nuxt types, seven tests and production build).
  `pnpm test:http` passed the full isolated HTTP/SQLite suite.
- #112: first/last inventory row menus stayed within the 120px gutter. Pointer removal and
  undo passed at desktop and 390px in light/dark. Hit testing selected the Remove button;
  the final menu scrolled into view inside the virtual viewport.
- #111: the inventory grid reported nine columns with indices 1–9; the location tree
  reported four columns including selection. Regression tests cover all table utility
  combinations, reordered/hidden columns, grid row numbers and horizontal virtualization.
- #113: changing the mounted location tree from ancestors to strict hid context parents;
  descendants restored loaded children of the matching warehouse. All modes retained
  25 selected locations and the same two branch requests. Clearing search restored saved
  expansion. Core and component tests cover both full surfaces and preserve edit undo.
- An active Product draft survived actual vertical scrolling away and back, committed its
  retained text and undid successfully. Tree ArrowLeft collapsed an aisle, another
  ArrowLeft focused its parent, and ArrowRight focused the open parent's first child.
- No captured Chromium console errors occurred during these candidate interactions.

Release target: **3.0.0-beta.1**. Still pending: pushes and PR merges (GitHub connections time
out), corrected published-alpha pins/retest, hosted Windows/Linux CI, Firefox/WebKit,
screen-reader acceptance and the complete keyboard-only matrix. Local candidate results
do not mark the beta gate complete.
