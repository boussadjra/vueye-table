import { getRowItemKey, gridCommand, type RowKey, type TableRow } from "@vueye-table/core";
import { injectDataGrid, injectDataTable, type AnyDataTableBinding } from "@vueye-table/vue";
import {
  defineComponent,
  computed,
  h,
  inject,
  nextTick,
  provide,
  shallowRef,
  useId,
  type ComponentPublicInstance,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeChild,
} from "vue";

import { asProp, rowProp } from "./shared";
import { injectVirtual, type ComponentVirtualBinding } from "./virtual";

export const hierarchyProps = {
  treeColumn: { type: String as PropType<string | undefined>, default: undefined },
  keepAliveDetail: { type: Boolean, default: false },
} as const;
interface Hierarchy {
  readonly id: string;
  readonly table: AnyDataTableBinding;
  readonly treeColumn: string | undefined;
  readonly keepAliveDetail: boolean;
  readonly focus: ReturnType<typeof shallowRef<RowKey | undefined>>;
  readonly focusKey: RowKey | undefined;
}
const hierarchyKey: InjectionKey<Hierarchy> = Symbol("vueye-table-hierarchy");
export function provideHierarchy(
  table: AnyDataTableBinding,
  props: { readonly treeColumn?: string | undefined; readonly keepAliveDetail: boolean },
): Hierarchy {
  const focus = shallowRef<RowKey>();
  const focusKey = computed(() =>
    table.rows.some((row) => row.key === focus.value) ? focus.value : table.rows[0]?.key,
  );
  const context: Hierarchy = {
    id: `vt-tree-${useId()}`,
    table,
    get treeColumn() {
      return props.treeColumn;
    },
    get keepAliveDetail() {
      return props.keepAliveDetail;
    },
    focus,
    get focusKey() {
      return focusKey.value;
    },
  };
  provide(hierarchyKey, context);
  return context;
}
export function injectHierarchy(): Hierarchy | undefined {
  return inject(hierarchyKey, undefined);
}
export function resolveTreeColumn(table: AnyDataTableBinding, column?: string): string | undefined {
  return table.columns.find((candidate) => candidate.id === column)?.id ?? table.columns[0]?.id;
}
function itemId(
  context: Hierarchy | undefined,
  row: TableRow<unknown>,
  detail = false,
): string | undefined {
  return context
    ? `${context.id}-${encodeURIComponent(getRowItemKey(row.key, detail ? "detail" : "row"))}`
    : undefined;
}
const siblingCache = new WeakMap<
  readonly TableRow<unknown>[],
  ReadonlyMap<RowKey, { position: number; size: number; index: number }>
>();
export function hierarchyRowAttrs(
  table: AnyDataTableBinding,
  row: TableRow<unknown>,
  context?: Hierarchy,
): Record<string, unknown> {
  if (!table.tree) return {};
  let positions = siblingCache.get(table.processedRows);
  if (!positions) {
    const groups = new Map<RowKey | undefined, TableRow<unknown>[]>();
    for (const candidate of table.processedRows) {
      const group = groups.get(candidate.parentKey) ?? [];
      group.push(candidate);
      groups.set(candidate.parentKey, group);
    }
    const indices = new Map(table.processedRows.map((candidate, index) => [candidate.key, index]));
    const result = new Map<RowKey, { position: number; size: number; index: number }>();
    for (const group of groups.values())
      group.forEach((candidate, index) =>
        result.set(candidate.key, {
          position: index + 1,
          size: group.length,
          index: indices.get(candidate.key)!,
        }),
      );
    positions = result;
    siblingCache.set(table.processedRows, result);
  }
  const position = positions.get(row.key);
  return {
    id: itemId(context, row),
    "data-tree-key": getRowItemKey(row.key),
    "aria-level": row.depth + 1,
    "aria-expanded": row.canExpand ? String(row.isExpanded) : undefined,
    "aria-setsize": position?.size,
    "aria-posinset": position?.position,
    "aria-rowindex": position ? position.index + 2 : undefined,
    "aria-busy": row.childStatus === "loading" ? "true" : undefined,
  };
}

/** Row-focused table navigation; cell-focused grids use the same pure core commands. */
export function treeKeydown(
  event: KeyboardEvent,
  context: Hierarchy,
  virtual?: ComponentVirtualBinding,
): void {
  const table = context.table;
  const target = event.target as HTMLElement | null;
  if (!table.tree || !target?.closest) return;
  if (
    target.closest("input, textarea, select, [contenteditable=true]") ||
    (target.closest("button") && !target.closest("[data-expand-toggle]"))
  )
    return;
  const key = target.closest("tr")?.getAttribute("data-tree-key");
  const index = table.rows.findIndex((row) => getRowItemKey(row.key) === key);
  const row = table.rows[index];
  if (!row) return;
  const command = gridCommand(event, { canExpand: row.canExpand, expanded: row.isExpanded });
  let next = row;
  if (command?.type === "tree") {
    if (command.action === "expand" || command.action === "collapse")
      table.toggleExpanded(row.key, command.action === "expand");
    else if (command.action === "siblings") {
      for (const sibling of table.processedRows.filter(
        (candidate) => candidate.parentKey === row.parentKey && candidate.canExpand,
      ))
        table.toggleExpanded(sibling.key, true);
    } else if (command.action === "child")
      next = table.rows.find((candidate) => candidate.parentKey === row.key) ?? row;
    else next = table.rows.find((candidate) => candidate.key === row.parentKey) ?? row;
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp")
    next = table.rows[index + (event.key === "ArrowDown" ? 1 : -1)] ?? row;
  else if (event.key === "Home" || event.key === "End")
    next = table.rows[event.key === "Home" ? 0 : table.rows.length - 1] ?? row;
  else return;
  event.preventDefault();
  context.focus.value = next.key;
  virtual?.rows.scrollToKey(next.key);
  const id = itemId(context, next);
  void nextTick(() =>
    target
      .closest("table")
      ?.ownerDocument.getElementById(id ?? "")
      ?.focus(),
  );
}

export const expandToggleProps = {
  row: rowProp,
  controls: { type: String as PropType<string | undefined>, default: undefined },
  expandLabel: { type: String, default: "Expand row" },
  collapseLabel: { type: String, default: "Collapse row" },
} as const;
export const treeCellProps = { row: rowProp, as: asProp("div") } as const;
export const DataTableExpandToggle = defineComponent({
  name: "DataTableExpandToggle",
  props: expandToggleProps,
  slots: Object as SlotsType<{
    default?: (props: { row: TableRow<unknown>; expanded: boolean }) => VNodeChild;
  }>,
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableExpandToggle>");
    const context = injectHierarchy();
    const grid = injectDataGrid();
    return () =>
      props.row.canExpand
        ? h(
            "button",
            {
              type: "button",
              "data-expand-toggle": "",
              tabindex: table.tree ? -1 : undefined,
              "aria-expanded": String(props.row.isExpanded),
              "aria-controls":
                props.controls ??
                (!table.tree
                  ? itemId(context, props.row, true)
                  : props.row.isExpanded
                    ? table.rows
                        .filter((row) => row.parentKey === props.row.key)
                        .map((row) => itemId(context, row))
                        .filter(Boolean)
                        .join(" ") || undefined
                    : undefined),
              "aria-label": props.row.isExpanded ? props.collapseLabel : props.expandLabel,
              onMousedown: (event: Event) => event.stopPropagation(),
              onDblclick: (event: Event) => event.stopPropagation(),
              onClick: (event: Event) => {
                event.stopPropagation();
                if (grid?.table === table)
                  grid.focusCell({
                    row: table.rows.indexOf(props.row),
                    column: Math.max(
                      0,
                      table.columns.findIndex(
                        (column) => column.id === resolveTreeColumn(table, context?.treeColumn),
                      ),
                    ),
                  });
                table.toggleExpanded(props.row.key);
                if (grid?.table === table)
                  void nextTick(() => (event.target as HTMLElement).closest("table")?.focus());
              },
            },
            slots.default?.({ row: props.row, expanded: props.row.isExpanded }) ??
              (props.row.isExpanded ? props.collapseLabel : props.expandLabel),
          )
        : null;
  },
});

export const DataTableTreeCell = defineComponent({
  name: "DataTableTreeCell",
  props: treeCellProps,
  slots: Object as SlotsType<{
    default?: () => VNodeChild;
    toggle?: (props: { row: TableRow<unknown> }) => VNodeChild;
  }>,
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableTreeCell>");
    const context = injectHierarchy();
    const grid = injectDataGrid();
    return () =>
      h(
        props.as,
        {
          class: "vt-tree-cell",
          "data-tree-cell": "",
          style: {
            paddingInlineStart: `calc(var(--vt-tree-indent, 1.25rem) * ${props.row.depth})`,
          },
        },
        [
          h(
            "span",
            { class: "vt-tree-toggle" },
            slots.toggle?.({ row: props.row }) ?? h(DataTableExpandToggle, { row: props.row }),
          ),
          h("span", { class: "vt-tree-label" }, [slots.default?.()]),
          props.row.childStatus === "loading"
            ? h("span", { class: "vt-tree-loading" }, "Loading children…")
            : null,
          props.row.childStatus === "error"
            ? h("span", { class: "vt-tree-error" }, [
                "Could not load children. ",
                h(
                  "button",
                  {
                    type: "button",
                    class: "vt-tree-retry",
                    onMousedown: (event: Event) => event.stopPropagation(),
                    onClick: (event: Event) => {
                      event.stopPropagation();
                      const element = (event.currentTarget as HTMLElement).closest("table");
                      if (grid?.table === table)
                        grid.focusCell({
                          row: table.rows.indexOf(props.row),
                          column: Math.max(
                            0,
                            table.columns.findIndex(
                              (column) =>
                                column.id === resolveTreeColumn(table, context?.treeColumn),
                            ),
                          ),
                        });
                      table.toggleExpanded(props.row.key, true);
                      void nextTick(() => {
                        if (grid?.table === table) element?.focus();
                        else
                          element?.ownerDocument
                            .getElementById(itemId(context, props.row) ?? "")
                            ?.focus();
                      });
                    },
                  },
                  "Retry children",
                ),
              ])
            : null,
        ],
      );
  },
});

/** One full-width detail; retained collapsed content remains hidden and unmeasured. */
export const DataTableDetailRow = defineComponent({
  name: "DataTableDetailRow",
  props: {
    row: rowProp,
    colspan: { type: Number, default: undefined },
    hidden: { type: Boolean, default: false },
    keepAlive: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  },
  slots: Object as SlotsType<{ default?: (props: { row: TableRow<unknown> }) => VNodeChild }>,
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableDetailRow>");
    const context = injectHierarchy();
    const virtual = injectVirtual();
    let opened = false;
    return () => {
      if (props.row.isExpanded && !props.hidden) opened = true;
      if (
        !opened ||
        ((!props.row.isExpanded || props.hidden) && !(props.keepAlive ?? context?.keepAliveDetail))
      )
        return null;
      const hidden = props.hidden || !props.row.isExpanded;
      return h(
        "tr",
        {
          id: itemId(context, props.row, true),
          "data-detail": "",
          hidden,
          ...(virtual && !hidden
            ? {
                ref: (target: Element | ComponentPublicInstance | null) =>
                  virtual.rows.measureElement(target, getRowItemKey(props.row.key, "detail")),
              }
            : {}),
        },
        [
          h(
            "td",
            {
              colspan: Math.max(1, props.colspan ?? table.columns.length),
              class: "vt-detail-cell",
            },
            [slots.default?.({ row: props.row })],
          ),
        ],
      );
    };
  },
});

export interface DetailSlotProps {
  readonly row: TableRow<unknown>;
  readonly rowIndex: number;
}
export function createDetails(
  table: AnyDataTableBinding,
  slot: () => ((props: DetailSlotProps) => VNodeChild) | undefined,
  colspan: () => number,
): {
  render(row: TableRow<unknown>, rowIndex: number): VNode;
  retained(visible: ReadonlySet<RowKey>): VNode[];
} {
  const context = injectHierarchy();
  const visited = new Set<RowKey>();
  const render = (row: TableRow<unknown>, rowIndex: number, hidden = false): VNode => {
    if (!hidden && context?.keepAliveDetail) visited.add(row.key);
    return h(
      DataTableDetailRow,
      { key: getRowItemKey(row.key, "detail"), row, colspan: colspan(), hidden },
      { default: () => slot()?.({ row, rowIndex }) },
    );
  };
  return {
    render,
    retained(visible) {
      if (!context?.keepAliveDetail) return [];
      return [...visited].flatMap((key) => {
        const index = table.rows.findIndex((row) => row.key === key);
        if (index < 0) {
          visited.delete(key);
          return [];
        }
        return visible.has(key) ? [] : [render(table.rows[index]!, index, true)];
      });
    },
  };
}
