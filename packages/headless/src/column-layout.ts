import { clampColumnWidth, type TableColumn } from "@vueye-table/core";
import { injectDataTable, useTableLocale, type AnyDataTableBinding } from "@vueye-table/vue";
import {
  computed,
  defineComponent,
  h,
  mergeProps,
  inject,
  onScopeDispose,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type VNode,
  type SlotsType,
} from "vue";

import { injectRowLayout, injectPinnedRow } from "./row-layout";
import { asProp, directionOf, flag } from "./shared";

export const resizingProps = {
  resizableColumns: { type: Boolean, default: false },
  /** Pixel widths of leading utility columns; unspecified widths default to 48. */
  leadingColumnWidths: {
    type: Array as PropType<readonly number[] | undefined>,
    default: undefined,
  },
} as const;
interface LayoutOptions {
  readonly resizableColumns: boolean;
  readonly leadingColumns: number;
  readonly leadingColumnWidths?: readonly number[] | undefined;
  readonly gutter?: number | undefined;
  readonly columnWidth?: number | undefined;
}
interface ColumnLayout {
  enabled(): boolean;
  resizable(): boolean;
  width(this: void, column: TableColumn<unknown>, fallback?: number): string;
  effectiveWidth(column: TableColumn<unknown>): number;
  attrs(column: TableColumn<unknown>, header?: boolean): Record<string, unknown>;
  leading(index: number, header: boolean): Record<string, unknown>;
  leadingWidths(): readonly number[];
  style(total?: number): Record<string, string> | undefined;
  preview(column: TableColumn<unknown>, width: number): void;
  clear(column: TableColumn<unknown>): void;
  colgroup(): VNode | null;
}
const layoutKey: InjectionKey<ColumnLayout> = Symbol("vt-column-layout");
const headerKey: InjectionKey<() => TableColumn<unknown>> = Symbol("vt-header-column");
export function provideHeaderColumn(column: () => TableColumn<unknown>): void {
  provide(headerKey, column);
}
export function injectColumnLayout(): ColumnLayout | undefined {
  return inject(layoutKey, undefined);
}
export function effectiveColumnWidth(column: TableColumn<unknown>, fallback = 120): number {
  return Math.max(1, clampColumnWidth(column, column.width ?? fallback));
}

/** CSS-only preview keeps one gesture to one engine operation. */
export function provideColumnLayout(
  table: AnyDataTableBinding,
  options: LayoutOptions,
  element: () => HTMLElement | undefined,
): ColumnLayout {
  const columns = computed(() => table.columns);
  const previewVariables = new Set<string>();
  const variable = (column: TableColumn<unknown>): string =>
    `--vt-column-${columns.value.findIndex((item) => item.id === column.id)}-width`;
  const sum = (values: readonly string[]): string =>
    values.length ? `calc(${values.join(" + ")})` : "0px";
  const layout: ColumnLayout = {
    enabled: () =>
      (options.resizableColumns && columns.value.some((column) => column.resizable)) ||
      columns.value.some((column) => column.pinned),
    resizable: () => options.resizableColumns,
    effectiveWidth: (column) => effectiveColumnWidth(column, options.columnWidth ?? 120),
    width: (column, fallback = layout.effectiveWidth(column)) =>
      `var(${variable(column)}, ${fallback}px)`,
    leadingWidths: () =>
      Array.from({ length: options.leadingColumns }, (_, index) => {
        const width =
          options.leadingColumnWidths?.[index] ??
          (options.gutter ? options.gutter / Math.max(1, options.leadingColumns) : 48);
        return Number.isFinite(width) && width > 0 ? width : 48;
      }),
    attrs(column, header = false) {
      if (!layout.enabled()) return {};
      const style: Record<string, string> = {};
      if (column.width !== undefined) style["width"] = `${column.width}px`;
      if (column.minWidth !== undefined) style["minWidth"] = `${column.minWidth}px`;
      if (layout.enabled()) style["width"] = layout.width(column);
      if (column.pinned) {
        const pins = columns.value.filter((item) => item.pinned === column.pinned);
        const index = pins.findIndex((item) => item.id === column.id);
        const previous = column.pinned === "start" ? pins.slice(0, index) : pins.slice(index + 1);
        style["position"] = "sticky";
        style[column.pinned === "start" ? "insetInlineStart" : "insetInlineEnd"] = sum([
          ...(column.pinned === "start" ? layout.leadingWidths().map((width) => `${width}px`) : []),
          ...previous.map((item) => layout.width(item)),
        ]);
        style["zIndex"] = header ? "4" : "2";
      }
      return {
        "data-pinned": column.pinned,
        "data-pinned-edge": flag(column.isPinnedEdge),
        "data-resizable": header ? flag(options.resizableColumns && column.resizable) : undefined,
        style,
      };
    },
    leading(index, header) {
      const pinned = columns.value.some((column) => column.pinned);
      return {
        "data-leading-column": index,
        "data-pinned": pinned ? "start" : undefined,
        "data-pinned-edge": flag(
          pinned &&
            !columns.value.some((column) => column.pinned === "start") &&
            index === options.leadingColumns - 1,
        ),
        style: pinned
          ? {
              position: "sticky",
              insetInlineStart: `${layout
                .leadingWidths()
                .slice(0, index)
                .reduce((a, b) => a + b, 0)}px`,
              zIndex: header ? "4" : "2",
            }
          : undefined,
      };
    },
    style(total) {
      if (!layout.enabled() && total === undefined) return undefined;
      const width =
        total === undefined
          ? sum([
              ...layout.leadingWidths().map((value) => `${value}px`),
              ...columns.value.map((column) => layout.width(column)),
            ])
          : `calc(${total}px + var(--vt-resize-delta, 0px))`;
      return { tableLayout: "fixed", width };
    },
    preview(column, width) {
      element()?.style.setProperty(variable(column), `${width}px`);
      previewVariables.add(variable(column));
      element()?.style.setProperty(
        "--vt-resize-delta",
        `${width - layout.effectiveWidth(column)}px`,
      );
    },
    clear() {
      for (const name of previewVariables) element()?.style.removeProperty(name);
      previewVariables.clear();
      element()?.style.removeProperty("--vt-resize-delta");
    },
    colgroup() {
      return layout.enabled()
        ? h("colgroup", [
            ...layout.leadingWidths().map((width) => h("col", { style: { width: `${width}px` } })),
            ...columns.value.map((column) =>
              h("col", { key: column.id, style: { width: layout.width(column) } }),
            ),
          ])
        : null;
    },
  };
  provide(layoutKey, layout);
  return layout;
}

/** Leading selection, disclosure or row-number cells share start-region offsets. */
export const DataTableLeadingCell = defineComponent({
  name: "DataTableLeadingCell",
  props: { as: asProp("td"), index: { type: Number, default: 0 } },
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  setup(props, { slots, attrs }) {
    const layout = injectColumnLayout();
    const rows = injectRowLayout();
    const pin = injectPinnedRow();
    return () => {
      const header = props.as === "th" && attrs["scope"] !== "row";
      const leading = layout?.leading(props.index, header) ?? {};
      return h(
        props.as,
        mergeProps(
          leading,
          { style: header ? rows?.headerStyle(!!leading["data-pinned"]) : undefined },
          pin?.attrs(!!leading["data-pinned"]) ?? {},
        ),
        slots.default?.(),
      );
    };
  },
});

/** A keyboard-operable separator; pointer movement previews and release commits once. */
export const DataTableColumnResizer = defineComponent({
  name: "DataTableColumnResizer",
  props: { column: { type: Object as PropType<TableColumn<any> | undefined>, default: undefined } },
  setup(props) {
    const table = injectDataTable("<DataTableColumnResizer>");
    const header = inject(headerKey, undefined);
    const layout = injectColumnLayout();
    const locale = useTableLocale();
    const preview = shallowRef<number>();
    let drag:
      | {
          target: HTMLElement;
          pointer: number;
          x: number;
          width: number;
          column: TableColumn<unknown>;
          sign: number;
        }
      | undefined;
    const column = (): TableColumn<unknown> | undefined => props.column ?? header?.();
    const currentWidth = (value: TableColumn<unknown>): number =>
      layout?.effectiveWidth(value) ?? effectiveColumnWidth(value);
    const stop = (commit = false): void => {
      const current = drag;
      if (!current) return;
      drag = undefined;
      const width = preview.value;
      if (commit && width !== undefined) table.resizeColumn(current.column.id, width);
      layout?.clear(current.column);
      preview.value = undefined;
      if (current.target.hasPointerCapture?.(current.pointer))
        current.target.releasePointerCapture(current.pointer);
    };
    const move = (event: PointerEvent): void => {
      if (!drag || drag.pointer !== event.pointerId) return;
      preview.value = Math.max(
        1,
        clampColumnWidth(drag.column, drag.width + (event.clientX - drag.x) * drag.sign),
      );
      layout?.preview(drag.column, preview.value);
    };
    watch(
      () => table.columns,
      () => stop(),
      { flush: "sync" },
    );
    onScopeDispose(() => stop());
    return () => {
      const current = column();
      if (!current?.resizable) return null;
      return h("span", {
        role: "separator",
        tabindex: 0,
        "aria-orientation": "vertical",
        "aria-label": locale().messages.resizeColumn(current.header),
        "aria-description": locale().messages.resizeColumnHelp,
        "aria-valuenow": preview.value ?? currentWidth(current),
        "aria-valuemin": Math.max(1, current.minWidth ?? 1),
        "aria-valuemax":
          current.maxWidth === undefined
            ? undefined
            : Math.max(1, current.minWidth ?? 1, current.maxWidth),
        "data-column-resizer": "",
        "data-resizing": flag(preview.value !== undefined),
        style: { touchAction: "none", cursor: "col-resize", userSelect: "none" },
        onClick: (event: MouseEvent) => event.stopPropagation(),
        onDblclick: (event: MouseEvent) => {
          event.stopPropagation();
          stop();
          table.resetColumnSize(current.id);
        },
        onPointerdown: (event: PointerEvent) => {
          if (event.button !== 0 || drag || !layout) return;
          const target = event.currentTarget as HTMLElement;
          target.focus({ preventScroll: true });
          target.setPointerCapture?.(event.pointerId);
          event.preventDefault();
          event.stopPropagation();
          drag = {
            target,
            pointer: event.pointerId,
            x: event.clientX,
            width: currentWidth(current),
            column: current,
            sign: directionOf(target) === "rtl" ? -1 : 1,
          };
          preview.value = drag.width;
        },
        onPointermove: move,
        onPointerup: (event: PointerEvent) => {
          if (drag?.pointer === event.pointerId) {
            move(event);
            stop(true);
          }
        },
        onPointercancel: (event: PointerEvent) => {
          if (drag?.pointer === event.pointerId) stop();
        },
        onLostpointercapture: (event: PointerEvent) => {
          if (drag?.pointer === event.pointerId) stop();
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === "Escape" && drag) {
            event.preventDefault();
            event.stopPropagation();
            stop();
            return;
          }
          if (drag) return;
          let width: number | undefined;
          const sign = directionOf(event.currentTarget as Element) === "rtl" ? -1 : 1;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight")
            width =
              currentWidth(current) +
              (event.key === "ArrowRight" ? 1 : -1) * sign * (event.shiftKey ? 50 : 10);
          else if (event.key === "Home") width = Math.max(1, current.minWidth ?? 1);
          else if (event.key === "End") width = current.maxWidth;
          else if (event.key === "Enter") table.resetColumnSize(current.id);
          else return;
          event.preventDefault();
          event.stopPropagation();
          if (width !== undefined) table.resizeColumn(current.id, Math.max(1, width));
        },
      });
    };
  },
});
