import {
  getRowItemKey,
  type RowKey,
  type TableGroup,
  type TableRenderItem,
  type TableRow,
} from "@vueye-table/core";
import type { AnyDataTableBinding } from "@vueye-table/vue";
import {
  cloneVNode,
  getCurrentInstance,
  computed,
  defineComponent,
  h,
  inject,
  onMounted,
  onUpdated,
  onScopeDispose,
  provide,
  shallowRef,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNode,
} from "vue";

import { rowProp } from "./shared";

export const groupingProps = {
  aggregatePosition: { type: String as PropType<"group" | "footer">, default: "group" },
} as const;
interface RowLayoutOptions {
  readonly aggregatePosition: "group" | "footer";
  readonly rowHeight: number;
}
interface RowLayout {
  readonly aggregatePosition: "group" | "footer";
  readonly items: readonly TableRenderItem<unknown>[];
  readonly topHeight: number;
  readonly bottomHeight: number;
  readonly headerHeight: number;
  readonly count: number | undefined;
  index(key: RowKey, kind?: "row" | "detail" | "group"): number | undefined;
  level(key: RowKey): number | undefined;
  footer(key: RowKey): TableGroup | undefined;
  register(key: RowKey, target: Element | null, owner?: Element): void;
  pinStyle(side: "top" | "bottom", key: RowKey, columnPinned: boolean): Record<string, string>;
  headerStyle(columnPinned: boolean): Record<string, string> | undefined;
}
interface PinnedRow {
  readonly side: "top" | "bottom";
  attrs(columnPinned?: boolean): Record<string, unknown>;
}
const layoutKey: InjectionKey<RowLayout> = Symbol("vt-row-layout");
const pinnedKey: InjectionKey<PinnedRow> = Symbol("vt-pinned-row");
export function injectRowLayout(): RowLayout | undefined {
  return inject(layoutKey, undefined);
}
export function injectPinnedRow(): PinnedRow | undefined {
  return inject(pinnedKey, undefined);
}

/** Presentation indices include group headers and optional footers; grid positions stay on leaves. */
export function provideRowLayout(
  table: AnyDataTableBinding,
  options: RowLayoutOptions,
  element: () => HTMLElement | undefined,
): RowLayout {
  const measured = shallowRef<ReadonlyMap<RowKey, number>>(new Map());
  const headerHeight = shallowRef(0);
  const targets = new Map<RowKey, Element>();
  let head: Element | null = null;
  let observer: ResizeObserver | undefined;
  const plan = computed(() => {
    if (!table.grouped && table.topRows.length === 0 && table.bottomRows.length === 0)
      return {
        items: table.renderItems as readonly TableRenderItem<unknown>[],
        footers: new Map<RowKey, TableGroup>(),
        indices: new Map<RowKey, number>(),
        levels: new Map<RowKey, number>(),
        structured: false,
      };
    const items: TableRenderItem<unknown>[] = [];
    const footers = new Map<RowKey, TableGroup>();
    const stack: TableGroup[] = [];
    const levels = new Map<RowKey, number>();
    let depth = 0;
    const appendFooter = (): void => {
      const group = stack.pop()!;
      const key = JSON.stringify(["aggregate-footer", group.key]);
      footers.set(key, group);
      items.push(Object.freeze({ ...group, key }));
    };
    const footerMode =
      options.aggregatePosition === "footer" && table.columns.some((column) => column.aggregate);
    for (const item of table.renderItems) {
      if (item.kind === "group") depth = item.depth;
      else levels.set(item.row.key, depth + 2);
      if (footerMode && item.kind === "group") {
        while (stack.length && stack.at(-1)!.depth >= item.depth) appendFooter();
        if (item.isExpanded) stack.push(item);
      }
      items.push(item);
    }
    while (stack.length) appendFooter();
    const structured = table.grouped || table.topRows.length > 0 || table.bottomRows.length > 0;
    const indices = new Map<RowKey, number>();
    table.topRows.forEach((row, index) => indices.set(getRowItemKey(row.key), index + 2));
    items.forEach((item, index) => indices.set(item.key, table.topRows.length + index + 2));
    table.bottomRows.forEach((row, index) =>
      indices.set(getRowItemKey(row.key), table.topRows.length + items.length + index + 2),
    );
    return { items: Object.freeze(items), footers, indices, structured, levels };
  });
  const size = (key: RowKey): number =>
    measured.value.get(key) ?? (options.rowHeight > 0 ? options.rowHeight : 40);
  const region = (side: "top" | "bottom"): readonly TableRow<unknown>[] =>
    side === "top" ? table.topRows : table.bottomRows;
  const height = (side: "top" | "bottom"): number =>
    region(side).reduce((sum, row) => sum + size(row.key), 0);
  const measure = (target: Element, key?: RowKey): void => {
    const value = target.getBoundingClientRect().height;
    if (key === undefined) {
      if (Number.isFinite(value)) headerHeight.value = Math.max(0, value);
    } else if (value > 0 && Number.isFinite(value) && measured.value.get(key) !== value)
      measured.value = new Map(measured.value).set(key, value);
  };
  const refresh = (): void => {
    const next = element()?.querySelector("thead") ?? null;
    if (head !== next) {
      if (head) observer?.unobserve(head);
      head = next;
      if (head) observer?.observe(head);
    }
    if (head) measure(head);
    for (const [key, target] of targets) measure(target, key);
  };
  onMounted(() => {
    const Observer = element()?.ownerDocument.defaultView?.ResizeObserver;
    if (Observer)
      observer = new Observer((entries) => {
        for (const { target } of entries) {
          if (target === head) measure(target);
          else for (const [key, value] of targets) if (value === target) measure(target, key);
        }
      });
    refresh();
    for (const [key, target] of targets) {
      observer?.observe(target);
      measure(target, key);
    }
  });
  onUpdated(refresh);
  onScopeDispose(() => {
    observer?.disconnect();
    targets.clear();
  });
  const layout: RowLayout = {
    get aggregatePosition() {
      return options.aggregatePosition;
    },
    get items() {
      return plan.value.items;
    },
    get headerHeight() {
      return headerHeight.value;
    },
    get topHeight() {
      return height("top");
    },
    get bottomHeight() {
      return height("bottom");
    },
    get count() {
      return plan.value.structured
        ? table.topRows.length + plan.value.items.length + table.bottomRows.length + 1
        : undefined;
    },
    index(key, kind = "row") {
      return plan.value.structured
        ? plan.value.indices.get(kind === "group" ? key : getRowItemKey(key, kind))
        : undefined;
    },
    level(key) {
      return table.grouped ? (plan.value.levels.get(key) ?? 1) : undefined;
    },
    footer: (key) => plan.value.footers.get(key),
    register(key, target, owner) {
      const previous = targets.get(key);
      if (!target && owner && previous !== owner) return;
      if (previous === target) return;
      if (previous) observer?.unobserve(previous);
      if (target) {
        targets.set(key, target);
        observer?.observe(target);
        measure(target, key);
      } else {
        targets.delete(key);
        if (measured.value.has(key)) {
          const next = new Map(measured.value);
          next.delete(key);
          measured.value = next;
        }
      }
    },
    pinStyle(side, key, columnPinned) {
      const rows = region(side);
      const index = rows.findIndex((row) => row.key === key);
      const before = side === "top" ? rows.slice(0, index) : rows.slice(index + 1);
      const offset = before.reduce((sum, row) => sum + size(row.key), 0);
      return {
        position: "sticky",
        [side === "top" ? "insetBlockStart" : "insetBlockEnd"]:
          `${offset + (side === "top" ? headerHeight.value : 0)}px`,
        zIndex: columnPinned ? "5" : "3",
      };
    },
    headerStyle(columnPinned) {
      return table.topRows.length || table.bottomRows.length
        ? { position: "sticky", insetBlockStart: "0px", zIndex: columnPinned ? "6" : "4" }
        : undefined;
    },
  };
  provide(layoutKey, layout);
  return layout;
}

/** Apply region context to an ordinary data row without changing its cell/grid coordinates. */
export const DataTablePinnedRow = defineComponent({
  name: "DataTablePinnedRow",
  props: { row: rowProp, side: { type: String as PropType<"top" | "bottom">, required: true } },
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  setup(props, { slots }) {
    const layout = injectRowLayout();
    const instance = getCurrentInstance();
    let current: Element | undefined;
    const register = (): void => {
      const target = instance?.subTree.el as Element | null | undefined;
      if (target && "getBoundingClientRect" in target) {
        current = target;
        layout?.register(props.row.key, target);
      }
    };
    onMounted(register);
    onUpdated(register);
    onScopeDispose(() => layout?.register(props.row.key, null, current));
    provide(pinnedKey, {
      get side() {
        return props.side;
      },
      attrs: (columnPinned = false) => ({
        "data-row-pinned": props.side,
        style: layout?.pinStyle(props.side, props.row.key, columnPinned),
      }),
    });
    return () => {
      const child = slots.default?.()[0];
      return child
        ? cloneVNode(
            child,
            {
              "data-row-pinned": props.side,
            },
            true,
          )
        : h("tr");
    };
  },
});
