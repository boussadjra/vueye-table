import {
  createVirtualizer,
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
}
export interface UseVirtualRowsOptions<TRow> extends VirtualViewportOptions {
  readonly estimateRowHeight?: number | ((index: number) => number) | undefined;
  /** Connect logical grid focus to the rendered data row, skipping details. */
  readonly grid?: DataGridBinding<TRow> | undefined;
}
export interface UseVirtualColumnsOptions extends VirtualViewportOptions {
  readonly estimateColumnWidth?: number | ((index: number) => number) | undefined;
}
export interface VirtualRowItem<TRow> extends VirtualItem {
  readonly renderItem: TableRenderItem<TRow>;
}
export interface VirtualColumnItem<TRow> extends VirtualItem {
  readonly column: TableColumn<TRow>;
}
export interface VirtualBinding<TItem extends VirtualItem> extends Omit<VirtualWindow, "items"> {
  readonly items: readonly TItem[];
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
): VirtualBinding<TItem> {
  let items = source();
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
    estimateSize: estimate,
    overscan: mounted ? options.overscan : 0,
    getKey: (index: number): RowKey => keyOf(items[index]!),
  });
  const virtual = createVirtualizer(layoutOptions());
  function seed(): void {
    let size = 0;
    for (let index = 0; index < Math.min(initialCount, items.length); index += 1) {
      const value = typeof estimate === "number" ? estimate : estimate(index);
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

  function move(offset: number): void {
    if (element) {
      if (horizontal) element.scrollLeft = offset;
      else element.scrollTop = offset;
    }
    virtual.setViewport(
      offset,
      element
        ? horizontal
          ? element.clientWidth
          : element.clientHeight
        : virtual.getWindow().viewportSize,
    );
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
      if (horizontal) element.scrollLeft = virtual.getWindow().offset;
      else element.scrollTop = virtual.getWindow().offset;
    }
  }
  function measure(target: Element, key: RowKey): void {
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
        horizontal ? element.scrollLeft : element.scrollTop,
        horizontal ? element.clientWidth : element.clientHeight,
      );
  }
  const stopSource = watch(
    source,
    (next) => {
      const saved = anchor();
      const offset = virtual.getWindow().offset;
      items = next;
      virtual.setOptions(layoutOptions());
      if (mounted) restore(saved, offset);
      else seed();
    },
    { flush: "sync" },
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
      stopElement?.();
      detach?.();
      observer?.disconnect();
      unsubscribe();
      elements.clear();
      keysByElement.clear();
      element = undefined;
    });
  const binding = {
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
        measure(target, key);
      }
    },
  } as Record<string, unknown> &
    Pick<VirtualBinding<TItem>, "scrollToIndex" | "scrollToKey" | "measureElement">;
  for (const key of Object.keys(view.value))
    Object.defineProperty(binding, key, {
      enumerable: true,
      get: () =>
        key === "items"
          ? projected.value
          : key === "issues" && initialIssue
            ? Object.freeze([...view.value.issues, initialIssue])
            : view.value[key as keyof VirtualWindow],
    });
  return Object.freeze(binding) as unknown as VirtualBinding<TItem>;
}

/** Virtualize data and detail render items. scrollToKey accepts the parent data-row key. */
export function useVirtualRows<TRow>(
  table: DataTableBinding<TRow>,
  options: UseVirtualRowsOptions<TRow>,
): VirtualBinding<VirtualRowItem<TRow>> {
  const virtual = useVirtualAxis(
    () => table.renderItems,
    (item) => item.key,
    options.estimateRowHeight ?? 40,
    options,
    false,
    (item, renderItem) => ({ ...item, renderItem }),
  );
  const stopFocus = watch(
    () => options.grid?.selection?.focus.row,
    (row) => {
      if (row === undefined) return;
      const index = table.renderItems.findIndex(
        (item) => item.kind === "row" && item.rowIndex === row,
      );
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

/** Virtualize visible columns and bring the active logical column into view. */
export function useVirtualColumns<TRow>(
  grid: DataGridBinding<TRow>,
  options: UseVirtualColumnsOptions,
): VirtualBinding<VirtualColumnItem<TRow>> {
  const virtual = useVirtualAxis(
    () => grid.table.columns,
    (column) => column.id,
    options.estimateColumnWidth ?? 120,
    options,
    true,
    (item, column) => ({ ...item, column }),
  );
  const stopFocus = watch(
    () => grid.selection?.focus.column,
    (column) => {
      if (column !== undefined) virtual.scrollToIndex(column);
    },
    { flush: "sync" },
  );
  if (getCurrentScope()) onScopeDispose(stopFocus);
  return virtual;
}
