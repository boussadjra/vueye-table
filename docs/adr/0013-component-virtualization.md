# ADR 0013: Component virtualization

- Status: Accepted
- Date: 2026-10-07
- Scope: #72; core layout lookup, Vue bindings, headless/styled/full components and Nuxt registration

## Decision

Virtualization is opt-in. Existing non-virtual table and grid markup and keyboard behavior remain unchanged. `virtual` accepts a boolean or `ComponentVirtualOptions`; `rowHeight`, `overscan`, `height`, `virtualColumns` and `columnWidth` supply convenient props. Estimates, initial counts, overscan and the enabled column axis are creation options. Remount the renderer to change these options; data, state and viewport size remain reactive.

`DataTableViewport` supplies its mounted element to descendants and owns scrolling, a CSS height (default `24rem`) and disabled native anchoring. `DataTableRoot` and `DataGridRoot` can enable the renderer for their default bodies; a body can opt in separately under the viewport. Headless callers supply their existing table binding, so virtualization can cover all rows or a large page. Styled `VtTable` and `VtGrid` own the viewport, reuse this renderer, and make the header sticky. Full `VueyeTable` defaults to `paginate: false` when virtual; explicit `paginate` retains paging. Its pagination controls are hidden when virtual and paging is off, while an explicit footer slot remains available. Virtual `VueyeGrid` follows its `pagination` choice unless `paginate` overrides it. Ordinary full-component defaults remain unchanged.

Native spacer rows keep vertical table structure. Data and independently keyed detail items use the existing flattened render model and keyed measurements. A `DataTableBody` detail slot renders and measures supplied detail content. Component tree controls and rich expandable grid detail rendering remain #85. A virtual grid with no detail renderer reserves detail extent without treating it as an addressable grid row.

Column virtualization shares a single slice between headers and cells. A fixed table layout, colgroup and spacer cells preserve widths and gaps. Explicit column widths win; the fallback is `columnWidth` (120). The styled row-number gutter reserves 48 pixels outside data-column coordinates. `DataTableVirtualColumns` and `injectVirtualRenderer` expose the slice for custom composition. The exported `virtualProps` declaration keeps the same prop contract across renderer layers. Custom full-body slots own their markup; built-in cell/header slots retain automatic virtualization.

Logical row/column indices and total counts remain independent of the rendered slice. Focus changes scroll both axes. Manual scrolling keeps the logical active and edited row/column in the rendered set, with spacer gaps at their actual positions, so `aria-activedescendant` always names a mounted built-in grid cell and a draft editor is not destroyed. The grid retains DOM focus; Page Up/Down moves by the viewport's row capacity and Ctrl/Command + Home/End reaches the first/last cell. Selection, copying, pasting and undo stay in the existing keyed engine.

The core virtualizer and Vue binding add `getItem(index)` for frozen offscreen layout lookup without moving the viewport; missing/invalid indices return undefined. Vue viewport options add a reactive `scrollMargin` for leading header/gutter space. Scroll destinations and usable viewport size account for this space, keeping the last row reachable beneath a sticky header. Invalid margins recover to zero with a TableIssue. No package reads a browser global or adds a framework dependency to core.

SSR and the initial hydration render `initialCount` rows (default 10) and `initialColumnCount` columns (default 5), without overscan; mounted dimensions then take over. Newly attached item refs are measured after the DOM patch, so temporary spacer removal cannot clamp a pending scroll. Virtual grid cells leave scrolling to the virtual axes. Body and root virtual options recover through the existing layout diagnostics. Observation and keyed element refs are released with their effect scope. Nuxt registers the new viewport and column helper when layer components are enabled.

## Consequences

Virtualization bounds DOM work, not source indexing, filtering or sorting. Column widths are explicit in a virtual grid; custom headless layouts must keep their headers and body aligned and reserve the correct gutter. Use the built-in cell/row-header slots for automatic grid behavior; replacing the whole body makes markup and focus retention the caller's responsibility. Renderer configuration is provisional alpha API. The 100k-record component example, SSR/hydration and keyboard/editing tests accompany this decision; browser behavior is recorded separately in the feature PR.
