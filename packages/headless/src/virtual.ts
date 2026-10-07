import type { TableColumn, TableRow } from "@vueye-table/core";
import {
  useVirtualColumns,
  useVirtualRows,
  type AnyDataTableBinding,
  type DataGridBinding,
  type VirtualBinding,
  type VirtualColumnItem,
  type VirtualRowItem,
} from "@vueye-table/vue";
import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  shallowRef,
  type InjectionKey,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNode,
  type VNodeChild,
} from "vue";

import { asProp } from "./shared";

export interface ComponentVirtualOptions {
  readonly rowHeight?: number | ((index: number) => number) | undefined;
  readonly overscan?: number | undefined;
  readonly initialCount?: number | undefined;
  readonly columnWidth?: number | undefined;
  readonly columnOverscan?: number | undefined;
  readonly initialColumnCount?: number | undefined;
}

/** Shared opt-in renderer props. Options are applied when the virtual renderer is created. */
export const virtualProps = {
  virtual: {
    type: [Boolean, Object] as PropType<boolean | ComponentVirtualOptions>,
    default: false,
  },
  height: { type: String as PropType<string | undefined>, default: undefined },
  rowHeight: { type: Number, default: 40 },
  overscan: { type: Number, default: 5 },
  virtualColumns: { type: Boolean, default: false },
  columnWidth: { type: Number, default: 120 },
} as const;

export function virtualOptions(props: {
  readonly virtual: boolean | ComponentVirtualOptions;
  readonly rowHeight: number;
  readonly overscan: number;
  readonly columnWidth: number;
}): ComponentVirtualOptions {
  return {
    rowHeight: props.rowHeight,
    overscan: props.overscan,
    columnWidth: props.columnWidth,
    ...(typeof props.virtual === "object" ? props.virtual : {}),
  };
}

const viewportKey: InjectionKey<ShallowRef<HTMLElement | null | undefined>> = Symbol("vt-viewport");
export interface ComponentVirtualBinding {
  readonly rows: VirtualBinding<VirtualRowItem<unknown>>;
  readonly columns: VirtualBinding<VirtualColumnItem<unknown>> | undefined;
  readonly rowItems: readonly VirtualRowItem<unknown>[];
  readonly columnItems: readonly VirtualColumnItem<unknown>[] | undefined;
  readonly gutter: number;
}
const virtualKey: InjectionKey<ComponentVirtualBinding> = Symbol("vt-virtual-renderer");
export function injectVirtual(): ComponentVirtualBinding | undefined {
  return inject(virtualKey, undefined);
}

/** A scroll container for a headless table/grid. It supplies its element without global reads. */
export const DataTableViewport = defineComponent({
  name: "DataTableViewport",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  props: { as: asProp("div"), height: { type: String, default: "24rem" } },
  setup(props, { slots, expose }) {
    const element = shallowRef<HTMLElement | null>(null);
    provide(viewportKey, element);
    expose({ element });
    return () =>
      h(
        props.as,
        {
          ref: element,
          "data-virtual-viewport": "",
          style: { height: props.height, overflow: "auto", overflowAnchor: "none" },
        },
        slots.default?.(),
      );
  },
});

export function createComponentVirtual(
  table: AnyDataTableBinding,
  options: ComponentVirtualOptions,
  tableElement: () => HTMLElement | null | undefined,
  grid?: DataGridBinding<unknown>,
  virtualColumns = false,
  gutter = 0,
): ComponentVirtualBinding {
  const scrollElement = inject(viewportKey, shallowRef<HTMLElement | null>(null));
  const rows = useVirtualRows(table, {
    scrollElement,
    estimateRowHeight: options.rowHeight,
    overscan: options.overscan,
    initialCount: options.initialCount,
    grid,
    scrollMargin: () => tableElement()?.querySelector("thead")?.getBoundingClientRect().height ?? 0,
  });
  const columns =
    grid && virtualColumns
      ? useVirtualColumns(grid, {
          scrollElement,
          estimateColumnWidth: (index) => table.columns[index]?.width ?? options.columnWidth ?? 120,
          overscan: options.columnOverscan ?? 1,
          initialCount: options.initialColumnCount ?? 5,
          scrollMargin: gutter,
        })
      : undefined;
  const pinnedRows = computed(() => {
    const result = [...rows.items];
    const positions = new Set([grid?.selection?.focus.row, grid?.editor?.position.row]);
    for (const position of positions) {
      if (
        position === undefined ||
        result.some(
          (item) => item.renderItem.kind === "row" && item.renderItem.rowIndex === position,
        )
      )
        continue;
      const direct = table.renderItems[position];
      const index =
        direct?.kind === "row" && direct.rowIndex === position
          ? position
          : table.renderItems.findIndex(
              (item) => item.kind === "row" && item.rowIndex === position,
            );
      const item = rows.getItem(index);
      if (item) result.push(item);
    }
    return result.sort((a, b) => a.index - b.index);
  });
  const pinnedColumns = computed(() => {
    if (!columns) return undefined;
    const result = [...columns.items];
    const positions = new Set([grid?.selection?.focus.column, grid?.editor?.position.column]);
    for (const position of positions) {
      if (position === undefined || result.some((item) => item.index === position)) continue;
      const item = columns.getItem(position);
      if (item) result.push(item);
    }
    return result.sort((a, b) => a.index - b.index);
  });
  const binding: ComponentVirtualBinding = {
    rows,
    columns,
    gutter,
    get rowItems() {
      return pinnedRows.value;
    },
    get columnItems() {
      return pinnedColumns.value;
    },
  };
  provide(virtualKey, binding);
  return binding;
}

/** Create composables only for an enabled renderer, preserving the ordinary component path. */
export const VirtualContent = defineComponent({
  name: "DataTableVirtualContent",
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    options: { type: Object as PropType<ComponentVirtualOptions>, required: true },
    tableElement: {
      type: Function as PropType<() => HTMLElement | null | undefined>,
      required: true,
    },
    grid: { type: Object as PropType<DataGridBinding<unknown>>, default: undefined },
    virtualColumns: { type: Boolean, default: false },
    gutter: { type: Number, default: 0 },
    render: {
      type: Function as PropType<(binding: ComponentVirtualBinding) => VNode>,
      required: true,
    },
  },
  setup(props) {
    const binding = createComponentVirtual(
      props.table,
      props.options,
      props.tableElement,
      props.grid,
      props.virtualColumns,
      props.gutter,
    );
    return () => props.render(binding);
  },
});

export function rowSpacer(size: number, colspan: number, key: string): VNode | null {
  return size > 0
    ? h(
        "tr",
        {
          key,
          "aria-hidden": "true",
          role: "presentation",
          "data-virtual-spacer": "",
          style: { height: `${size}px` },
        },
        [
          h("td", {
            colspan: Math.max(1, colspan),
            style: { height: `${size}px`, padding: "0", border: "0", lineHeight: "0" },
          }),
        ],
      )
    : null;
}
export function columnSpacer(size: number, tag: "th" | "td", key: string): VNode | null {
  return size > 0
    ? h(tag, {
        key,
        "aria-hidden": "true",
        role: "presentation",
        "data-virtual-spacer": "",
        style: { width: `${size}px`, minWidth: `${size}px`, padding: "0", border: "0" },
      })
    : null;
}
export function renderColumns(
  tableColumns: readonly TableColumn<unknown>[],
  binding: ComponentVirtualBinding | undefined,
  render: (column: TableColumn<unknown>, index: number) => VNodeChild,
  tag: "th" | "td",
): VNodeChild[] {
  if (!binding?.columns || !binding.columnItems) return tableColumns.map(render);
  const result: VNodeChild[] = [];
  let end = 0;
  for (const item of binding.columnItems) {
    result.push(
      columnSpacer(item.start - end, tag, `gap-${item.index}`),
      render(item.column, item.index),
    );
    end = item.start + item.size;
  }
  result.push(columnSpacer(binding.columns.totalSize - end, tag, "gap-end"));
  return result;
}
export function renderRows(
  binding: ComponentVirtualBinding,
  colspan: number,
  render: (item: VirtualRowItem<unknown>) => VNodeChild,
): VNodeChild[] {
  const result: VNodeChild[] = [];
  let end = 0;
  for (const item of binding.rowItems) {
    result.push(rowSpacer(item.start - end, colspan, `gap-${item.index}`), render(item));
    end = item.start + item.size;
  }
  result.push(rowSpacer(binding.rows.totalSize - end, colspan, "gap-end"));
  return result;
}
export function virtualColgroup(
  tableColumns: readonly TableColumn<unknown>[],
  binding: ComponentVirtualBinding,
): VNode | null {
  if (!binding.columns || !binding.columnItems) return null;
  const cols: VNodeChild[] = binding.gutter
    ? [h("col", { style: { width: `${binding.gutter}px` } })]
    : [];
  let end = 0;
  for (const item of binding.columnItems) {
    if (item.start > end) cols.push(h("col", { style: { width: `${item.start - end}px` } }));
    cols.push(h("col", { style: { width: `${item.size}px` } }));
    end = item.start + item.size;
  }
  if (binding.columns.totalSize > end)
    cols.push(h("col", { style: { width: `${binding.columns.totalSize - end}px` } }));
  void tableColumns;
  return h("colgroup", cols);
}
export function virtualRow(
  binding: ComponentVirtualBinding,
  row: TableRow<unknown>,
): VirtualRowItem<unknown> | undefined {
  return binding.rowItems.find(
    (item) => item.renderItem.kind === "row" && item.renderItem.row.key === row.key,
  );
}
