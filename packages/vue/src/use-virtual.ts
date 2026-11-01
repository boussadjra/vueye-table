import {
  createVirtualizer,
  clampColumnWidth,
  getRowItemKey,
  type RowKey,
  type TableColumn,
  type TableRenderItem,
  type VirtualAlign,
  type VirtualItem,
  type VirtualWindow,
  type TableIssue,
} from "@vueye-table/core";
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  nextTick,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComponentPublicInstance,
  type MaybeRefOrGetter,
} from "vue";

import type { DataGridBinding } from "./use-data-grid";
import type { DataTableBinding } from "./use-data-table";

export interface VirtualViewportOptions {
  readonly scrollElement: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly overscan?: number | undefined;
  /** Number of items rendered before mount, without overscan. Defaults to 10. */
  readonly initialCount?: number | undefined;
  /** Space before the items, such as a sticky header or leading row-number column. */
  readonly scrollMargin?: MaybeRefOrGetter<number> | undefined;
}
export interface UseVirtualRowsOptions<TRow> extends VirtualViewportOptions {
  /** A custom presentation sequence, for example headers with aggregate footers. */
  readonly renderItems?: MaybeRefOrGetter<readonly TableRenderItem<TRow>[]> | undefined;
  /** Measured non-scrolling row regions. They reserve space around the virtual centre. */
  readonly pinnedRowHeights?:
    | MaybeRefOrGetter<{ readonly top: number; readonly bottom: number }>
    | undefined;
  readonly estimateRowHeight?: number | ((index: number) => number) | undefined;
  /** Connect logical grid focus to the rendered data row, skipping details. */
  readonly grid?: DataGridBinding<TRow> | undefined;
}
export interface UseVirtualColumnsOptions extends VirtualViewportOptions {
  /** Fallback for columns without an effective width. Defaults to 120. */
  readonly estimateColumnWidth?: number | ((index: number) => number) | undefined;
}
export interface VirtualRowItem<TRow> extends VirtualItem {
  readonly renderItem: TableRenderItem<TRow>;
}
export interface VirtualColumnItem<TRow> extends VirtualItem {
  readonly column: TableColumn<TRow>;
}
export interface VirtualColumnBinding<TRow> extends VirtualBinding<VirtualColumnItem<TRow>> {
  readonly centerItems: readonly VirtualColumnItem<TRow>[];
  readonly pinnedStartItems: readonly VirtualColumnItem<TRow>[];
  readonly pinnedEndItems: readonly VirtualColumnItem<TRow>[];
}
export interface VirtualBinding<TItem extends VirtualItem> extends Omit<VirtualWindow, "items"> {
  readonly items: readonly TItem[];
  getItem(index: number): TItem | undefined;
  scrollToIndex(index: number, options?: { readonly align?: VirtualAlign | undefined }): void;
  scrollToKey(key: RowKey, options?: { readonly align?: VirtualAlign | undefined }): void;
  /** Pass the virtual item key explicitly; null releases its previously observed element. */
  measureElement(element: Element | ComponentPublicInstance | null, key: RowKey): void;
}

function useVirtualAxis<TSource, TItem extends VirtualItem>(
  source: () => readonly TSource[],
  keyOf: (item: TSource) => RowKey,
  estimate: number | ((index: number) => number),
  options: VirtualViewportOptions,
  horizontal: boolean,
  project: (item: VirtualItem, source: TSource) => TItem,
  sizeOf?: (item: TSource) => number | undefined,
  viewportInset: () => number = () => 0,
  stickyMargin: () => boolean = () => false,
): VirtualBinding<TItem> {
  let items = source();
  const knownSizes = new Map<RowKey, number | undefined>(
    sizeOf ? items.map((item) => [keyOf(item), sizeOf(item)]) : [],
  );
  const estimateSize = sizeOf
    ? (index: number): number =>
        sizeOf(items[index]!) ?? (typeof estimate === "number" ? estimate : estimate(index))
    : estimate;
  let mounted = false;
  let disposed = false;
  let element: HTMLElement | null | undefined;
  let observer: ResizeObserver | undefined;
  let detach: (() => void) | undefined;
  const elements = new Map<RowKey, Element>();
  const keysByElement = new Map<Element, RowKey>();
  const requestedCount = options.initialCount ?? 10;
  const initialCount =
    Number.isSafeInteger(requestedCount) && requestedCount >= 0 ? requestedCount : 10;
  const initialIssue: TableIssue | undefined =
    initialCount === requestedCount
      ? undefined
      : Object.freeze({
          code: "invalid_virtual_option",
          message: "Initial count must be a non-negative safe integer; 10 is used.",
        });
  const layoutOptions = () => ({
    count: items.length,
    estimateSize,
    overscan: mounted ? options.overscan : 0,
    getKey: (index: number): RowKey => keyOf(items[index]!),
  });
  const virtual = createVirtualizer(layoutOptions());
  function seed(): void {
    let size = 0;
    for (let index = 0; index < Math.min(initialCount, items.length); index += 1) {
      const value = typeof estimateSize === "number" ? estimateSize : estimateSize(index);
      size += Number.isFinite(value) && value > 0 ? value : 40;
    }
    virtual.setViewport(0, size);
  }
  seed();
  const view = shallowRef(virtual.getWindow());
  const projected = computed(() =>
    Object.freeze(view.value.items.map((item) => Object.freeze(project(item, items[item.index]!)))),
  );
  const unsubscribe = virtual.subscribe((next) => {
    view.value = next;
  });
  const marginIssue = shallowRef<TableIssue>();
  const insetIssue = shallowRef<TableIssue>();
  function inset(): number {
    const value = viewportInset();
    if (Number.isFinite(value) && value >= 0) {
      insetIssue.value = undefined;
      return value;
    }
    insetIssue.value ??= Object.freeze({
      code: "invalid_virtual_option",
      message: "Reserved row/column space must be non-negative and finite; 0 is used.",
    });
    return 0;
  }

  function margin(): number {
    const value = toValue(options.scrollMargin) ?? 0;
    if (Number.isFinite(value) && value >= 0) {
      marginIssue.value = undefined;
      return value;
    }
    marginIssue.value ??= Object.freeze({
      code: "invalid_virtual_option",
      message: "Scroll margin must be non-negative and finite; 0 is used.",
    });
    return 0;
  }
  function viewportSize(): number {
    return element
      ? Math.max(0, (horizontal ? element.clientWidth : element.clientHeight) - margin() - inset())
      : virtual.getWindow().viewportSize;
  }
  function move(offset: number): void {
    if (element) {
      if (horizontal)
        element.scrollLeft =
          scrollSign() * (offset === 0 ? 0 : offset + (stickyMargin() ? 0 : margin()));
      else element.scrollTop = offset === 0 ? 0 : offset + (stickyMargin() ? 0 : margin());
    }
    virtual.setViewport(offset, viewportSize());
  }
  function anchor(): { key: RowKey; inset: number } | undefined {
    const current = virtual.getWindow();
    const first = current.items.find((item) => item.start + item.size > current.offset);
    return first ? { key: first.key, inset: current.offset - first.start } : undefined;
  }
  function restore(saved: ReturnType<typeof anchor>, fallback: number): void {
    const index = saved ? items.findIndex((item) => keyOf(item) === saved.key) : -1;
    move(index >= 0 && saved ? virtual.getOffsetForIndex(index, "start") + saved.inset : fallback);
    // Reflect the clamp in the scroll element after shrink or removal.
    if (element) {
      const offset = virtual.getWindow().offset;
      if (horizontal)
        element.scrollLeft =
          scrollSign() * (offset === 0 ? 0 : offset + (stickyMargin() ? 0 : margin()));
      else element.scrollTop = offset === 0 ? 0 : offset + (stickyMargin() ? 0 : margin());
    }
  }
  function measure(target: Element, key: RowKey): void {
    readViewport();
    const saved = anchor();
    const offset = virtual.getWindow().offset;
    const box = target.getBoundingClientRect();
    const size = horizontal ? box.width : box.height;
    // Hidden and detached elements have no useful measurement; retain the estimate.
    if (size > 0 && Number.isFinite(size)) {
      const previous = virtual.getWindow();
      virtual.measure(key, size);
      if (virtual.getWindow() === previous) return;
      restore(saved, offset);
    }
  }
  function readViewport(): void {
    if (element)
      virtual.setViewport(
        Math.max(
          0,
          (horizontal ? element.scrollLeft * scrollSign() : element.scrollTop) -
            (stickyMargin() ? 0 : margin()),
        ),
        viewportSize(),
      );
  }
  function scrollSign(): number {
    return element?.closest("[dir]")?.getAttribute("dir")?.toLowerCase() === "rtl" ? -1 : 1;
  }
  const stopSource = watch(
    source,
    (next) => {
      // A focus or disclosure can scroll the element before its scroll event is delivered.
      readViewport();
      const saved = anchor();
      const offset = virtual.getWindow().offset;
      const resetMeasurements: RowKey[] = [];
      if (sizeOf) {
        for (const item of next) {
          const key = keyOf(item);
          const size = sizeOf(item);
          if (knownSizes.has(key) && !Object.is(knownSizes.get(key), size))
            resetMeasurements.push(key);
          // Keep hidden keys so width changes while hidden also discard their old measurement.
          knownSizes.set(key, size);
        }
      }
      items = next;
      virtual.setOptions(layoutOptions(), resetMeasurements);
      if (mounted) restore(saved, offset);
      else seed();
    },
    { flush: "sync" },
  );
  const stopInsets = watch(
    () => [toValue(options.scrollMargin), viewportInset(), stickyMargin()] as const,
    () => {
      if (mounted) readViewport();
    },
    { flush: "post" },
  );
  let stopElement: (() => void) | undefined;
  if (getCurrentInstance())
    onMounted(() => {
      mounted = true;
      virtual.setOptions(layoutOptions());
      stopElement = watch(
        () => toValue(options.scrollElement),
        (next) => {
          detach?.();
          observer?.disconnect();
          observer = undefined;
          element = next;
          if (!next) {
            seed();
            return;
          }
          const owner = next.ownerDocument.defaultView;
          const Observer = owner?.ResizeObserver;
          if (Observer) {
            observer = new Observer((entries) => {
              for (const entry of entries) {
                if (entry.target === element) readViewport();
                else {
                  const key = keysByElement.get(entry.target);
                  if (key !== undefined) measure(entry.target, key);
                }
              }
            });
            observer.observe(next);
            for (const target of elements.values()) observer.observe(target);
          } else owner?.addEventListener("resize", readViewport);
          next.addEventListener("scroll", readViewport, { passive: true });
          detach = () => {
            next.removeEventListener("scroll", readViewport);
            owner?.removeEventListener("resize", readViewport);
          };
          readViewport();
          for (const [key, target] of elements) measure(target, key);
        },
        { immediate: true, flush: "post" },
      );
    });
  if (getCurrentScope())
    onScopeDispose(() => {
      disposed = true;
      stopSource();
      stopInsets();
      stopElement?.();
      detach?.();
      observer?.disconnect();
      unsubscribe();
      elements.clear();
      keysByElement.clear();
      knownSizes.clear();
      element = undefined;
    });
  margin();
  inset();
  const binding = {
    getItem(index: number): TItem | undefined {
      // Reading the revision connects offscreen lookups to reactive measurements and layout.
      void view.value;
      const item = virtual.getItem(index);
      return item ? Object.freeze(project(item, items[index]!)) : undefined;
    },
    scrollToIndex(
      index: number,
      { align = "auto" }: { readonly align?: VirtualAlign | undefined } = {},
    ): void {
      move(virtual.getOffsetForIndex(index, align));
    },
    scrollToKey(key: RowKey, align?: { readonly align?: VirtualAlign | undefined }): void {
      const index = items.findIndex((item) => keyOf(item) === key);
      if (index >= 0) binding.scrollToIndex(index, align);
    },
    measureElement(target: Element | ComponentPublicInstance | null, key: RowKey): void {
      if (disposed) return;
      const previous = elements.get(key);
      if (previous === target) return;
      if (previous) {
        observer?.unobserve(previous);
        keysByElement.delete(previous);
        elements.delete(key);
      }
      if (!target || !("getBoundingClientRect" in target)) return;
      elements.set(key, target);
      keysByElement.set(target, key);
      if (mounted) {
        observer?.observe(target);
        // A ref can run midway through a keyed row/spacer patch. Reading layout there can
        // clamp a pending scroll against a temporarily shortened content area.
        void nextTick(() => {
          if (!disposed && elements.get(key) === target) measure(target, key);
        });
      }
    },
  } as Record<string, unknown> &
    Pick<VirtualBinding<TItem>, "getItem" | "scrollToIndex" | "scrollToKey" | "measureElement">;
  for (const key of Object.keys(view.value))
    Object.defineProperty(binding, key, {
      enumerable: true,
      get: () =>
        key === "items"
          ? projected.value
          : key === "issues" && (initialIssue || marginIssue.value || insetIssue.value)
            ? Object.freeze([
                ...view.value.issues,
                ...(initialIssue ? [initialIssue] : []),
                ...(marginIssue.value ? [marginIssue.value] : []),
                ...(insetIssue.value ? [insetIssue.value] : []),
              ])
            : view.value[key as keyof VirtualWindow],
    });
  return Object.freeze(binding) as unknown as VirtualBinding<TItem>;
}

/** Virtualize group, data and detail items. scrollToKey accepts the parent data-row key. */
export function useVirtualRows<TRow>(
  table: DataTableBinding<TRow>,
  options: UseVirtualRowsOptions<TRow>,
): VirtualBinding<VirtualRowItem<TRow>> {
  const renderItems = (): readonly TableRenderItem<TRow>[] =>
    options.renderItems ? toValue(options.renderItems) : table.renderItems;
  const reserved = (): number => {
    const heights = toValue(options.pinnedRowHeights);
    if (!heights) return 0;
    return heights.top >= 0 &&
      heights.bottom >= 0 &&
      Number.isFinite(heights.top) &&
      Number.isFinite(heights.bottom)
      ? heights.top + heights.bottom
      : Number.NaN;
  };
  const virtual = useVirtualAxis(
    renderItems,
    (item) => item.key,
    options.estimateRowHeight ?? 40,
    options,
    false,
    (item, renderItem) => ({ ...item, renderItem }),
    undefined,
    reserved,
    () => reserved() > 0,
  );
  const stopFocus = watch(
    [() => options.grid?.selection?.focus.row, renderItems],
    ([row, items], [, previousItems]) => {
      // Source changes already restore the visible anchor. A relocated selection must not
      // scroll against the previous layout during the same synchronous publication.
      if (row === undefined || items !== previousItems) return;
      const direct = items[row];
      const index =
        direct?.kind === "row" && direct.rowIndex === row
          ? row
          : items.findIndex((item) => item.kind === "row" && item.rowIndex === row);
      if (index >= 0) virtual.scrollToIndex(index);
    },
    { flush: "sync" },
  );
  if (getCurrentScope()) onScopeDispose(stopFocus);
  const binding = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(virtual),
      scrollToKey: {
        enumerable: true,
        value: (key: RowKey, align?: { readonly align?: VirtualAlign | undefined }): void =>
          virtual.scrollToKey(getRowItemKey(key), align),
      },
    },
  );
  return Object.freeze(binding) as VirtualBinding<VirtualRowItem<TRow>>;
}

/** Virtualize centre columns, retaining both pinned edges and logical display indices. */
export function useVirtualColumns<TRow>(
  grid: DataGridBinding<TRow>,
  options: UseVirtualColumnsOptions,
): VirtualColumnBinding<TRow> {
  const table = grid.table;
  const visibleColumns = computed(() => table.columns);
  const layout = computed(() => {
    const columns = visibleColumns.value;
    const center = columns.filter((column) => !column.pinned);
    return {
      center,
      indices: new Map(columns.map((column, index) => [column.id, index])),
      centerIndices: new Map(center.map((column, index) => [column.id, index])),
    };
  });
  const estimate = options.estimateColumnWidth ?? 120;
  const virtual = useVirtualAxis(
    () => layout.value.center,
    (column) => column.id,
    (index) =>
      typeof estimate === "number"
        ? estimate
        : estimate(layout.value.indices.get(layout.value.center[index]!.id)!),
    options,
    true,
    (item, column) => ({
      ...item,
      column,
      index: layout.value.indices.get(column.id)!,
      start: item.start + table.pinnedStartWidth,
    }),
    (column) =>
      column.width ??
      clampColumnWidth(
        column,
        typeof estimate === "number" ? estimate : estimate(layout.value.indices.get(column.id)!),
      ),
    () => table.pinnedStartWidth + table.pinnedEndWidth,
    () => table.pinnedStartWidth + table.pinnedEndWidth > 0,
  );
  const pinnedItems = (side: "start" | "end"): readonly VirtualColumnItem<TRow>[] =>
    Object.freeze(
      visibleColumns.value
        .filter((column) => column.pinned === side)
        .map((column) =>
          Object.freeze({
            key: column.id,
            index: layout.value.indices.get(column.id)!,
            size: column.width!,
            start:
              side === "start"
                ? column.pinOffset
                : table.pinnedStartWidth +
                  virtual.totalSize +
                  table.pinnedEndWidth -
                  column.pinOffset -
                  column.width!,
            column,
          }),
        ),
    );
  const start = computed(() => pinnedItems("start"));
  const end = computed(() => pinnedItems("end"));
  const all = computed(() => Object.freeze([...start.value, ...virtual.items, ...end.value]));
  const binding: VirtualColumnBinding<TRow> = Object.freeze({
    get items() {
      return all.value;
    },
    get centerItems() {
      return virtual.items;
    },
    get pinnedStartItems() {
      return start.value;
    },
    get pinnedEndItems() {
      return end.value;
    },
    get totalSize() {
      return table.pinnedStartWidth + virtual.totalSize + table.pinnedEndWidth;
    },
    get paddingStart() {
      return virtual.paddingStart;
    },
    get paddingEnd() {
      return virtual.paddingEnd;
    },
    get startIndex() {
      return virtual.items[0]?.index ?? 0;
    },
    get endIndex() {
      return virtual.items.at(-1)?.index ?? -1;
    },
    get offset() {
      return virtual.offset;
    },
    get viewportSize() {
      return virtual.viewportSize;
    },
    get issues() {
      return virtual.issues;
    },
    getItem(index: number): VirtualColumnItem<TRow> | undefined {
      const column = table.columns[index];
      if (!column) return undefined;
      if (column.pinned)
        return (column.pinned === "start" ? start.value : end.value).find(
          (item) => item.key === column.id,
        );
      return virtual.getItem(layout.value.centerIndices.get(column.id)!);
    },
    scrollToIndex(index: number, align?: { readonly align?: VirtualAlign | undefined }): void {
      const column = table.columns[index];
      if (!column || column.pinned) return;
      virtual.scrollToIndex(layout.value.centerIndices.get(column.id)!, align);
    },
    scrollToKey(key: RowKey, align?: { readonly align?: VirtualAlign | undefined }): void {
      if (typeof key !== "string") return;
      const index = layout.value.indices.get(key);
      if (index !== undefined) binding.scrollToIndex(index, align);
    },
    measureElement(target: Element | ComponentPublicInstance | null, key: RowKey): void {
      // Pinned widths come from the engine so sticky offsets and the virtual surface agree.
      if (typeof key === "string" && layout.value.centerIndices.has(key))
        virtual.measureElement(target, key);
      else virtual.measureElement(null, key);
    },
  });
  const stopFocus = watch(
    [() => grid.selection?.focus.column, () => table.columns],
    ([column, columns], [, previousColumns]) => {
      if (column !== undefined && columns === previousColumns) binding.scrollToIndex(column);
    },
    { flush: "sync" },
  );
  if (getCurrentScope()) onScopeDispose(stopFocus);
  return binding;
}
