import { issue, type TableIssue, type TableIssueCode } from "./issues";
import type { RowKey } from "./state";

export type VirtualAlign = "start" | "center" | "end" | "auto";

export interface VirtualizerOptions {
  readonly count: number;
  readonly estimateSize: number | ((index: number) => number);
  /** Extra items on each side. Defaults to 5. */
  readonly overscan?: number | undefined;
  /** Stable, unique identities preserve measurements across reorder and filtering. */
  readonly getKey?: ((index: number) => RowKey) | undefined;
  readonly onIssue?: ((problem: TableIssue) => void) | undefined;
}

export interface VirtualItem {
  readonly index: number;
  readonly key: RowKey;
  readonly start: number;
  readonly size: number;
}

export interface VirtualWindow {
  readonly items: readonly VirtualItem[];
  readonly totalSize: number;
  readonly paddingStart: number;
  readonly paddingEnd: number;
  /** Inclusive indices; an empty result uses 0 and -1. */
  readonly startIndex: number;
  readonly endIndex: number;
  /** Clamped viewport values, excluding overscan. */
  readonly offset: number;
  readonly viewportSize: number;
  readonly issues: readonly TableIssue[];
}

export interface Virtualizer {
  setOptions(options: VirtualizerOptions): void;
  setViewport(offset: number, size: number): void;
  measure(key: RowKey, size: number): void;
  getWindow(): VirtualWindow;
  /** Read an item's layout without moving the viewport; out-of-range indices return undefined. */
  getItem(index: number): VirtualItem | undefined;
  getOffsetForIndex(index: number, align?: VirtualAlign): number;
  subscribe(listener: (view: VirtualWindow) => void): () => void;
}

const FALLBACK_SIZE = 40;

/** Layout arithmetic for either axis. All viewport values and measurements come from the caller. */
export function createVirtualizer(initialOptions: VirtualizerOptions): Virtualizer {
  let options = initialOptions;
  let count = 0;
  let overscan = 5;
  let fixedSize: number | undefined;
  let keys: RowKey[] = [];
  let byKey = new Map<RowKey, number>();
  let sizes: number[] = [];
  // Retain only the prefix before the first changed item; extend it lazily on the next lookup.
  let prefix = [0];
  let offset = 0;
  let viewportSize = 0;
  let cached: VirtualWindow | undefined;
  const measured = new Map<RowKey, number>();
  const problems = new Map<TableIssueCode, TableIssue>();
  const listeners = new Set<(view: VirtualWindow) => void>();

  function recover(code: TableIssueCode, message: string): void {
    // One representative issue per code keeps diagnostics bounded even for many bad items.
    if (!problems.has(code)) {
      const problem = issue(code, message);
      problems.set(code, problem);
      options.onIssue?.(problem);
      cached = undefined;
    }
  }

  function validSize(value: number): number {
    if (Number.isFinite(value) && value > 0) return value;
    recover(
      "invalid_virtual_size",
      `Item size ${String(value)} is not positive and finite; 40 is used.`,
    );
    return FALLBACK_SIZE;
  }

  function configure(next: VirtualizerOptions): void {
    options = next;
    problems.clear();
    count = Number.isSafeInteger(next.count) && next.count >= 0 ? next.count : 0;
    if (count !== next.count) {
      recover(
        "invalid_virtual_option",
        "Virtual item count must be a non-negative safe integer; 0 is used.",
      );
    }
    const requestedOverscan = next.overscan ?? 5;
    overscan =
      Number.isSafeInteger(requestedOverscan) && requestedOverscan >= 0 ? requestedOverscan : 5;
    if (overscan !== requestedOverscan) {
      recover("invalid_virtual_option", "Overscan must be a non-negative safe integer; 5 is used.");
    }
    const estimate =
      typeof next.estimateSize === "number" ? validSize(next.estimateSize) : undefined;
    const nextKeys: RowKey[] = [];
    const nextSizes: number[] = [];
    const nextByKey = new Map<RowKey, number>();
    let firstChanged = count;
    let uniform = estimate !== undefined;
    for (let index = 0; index < count; index += 1) {
      let key = next.getKey ? next.getKey(index) : index;
      if (!(typeof key === "string" || (typeof key === "number" && Number.isFinite(key)))) {
        recover("invalid_virtual_option", `Item ${index} has an invalid key; its index is used.`);
        key = index;
      }
      if (nextByKey.has(key)) {
        recover(
          "duplicate_virtual_key",
          `Item ${index} repeats a key; a distinct fallback key is used.`,
        );
        key = JSON.stringify(["virtual", index]);
        while (nextByKey.has(key)) key += ":";
      }
      const size =
        measured.get(key) ??
        estimate ??
        validSize((next.estimateSize as (index: number) => number)(index));
      uniform &&= size === estimate;
      if (keys[index] !== key || sizes[index] !== size)
        firstChanged = Math.min(firstChanged, index);
      nextKeys.push(key);
      nextSizes.push(size);
      nextByKey.set(key, index);
    }
    if (fixedSize !== undefined || uniform) prefix = [0];
    else prefix.length = Math.min(prefix.length, firstChanged + 1);
    keys = nextKeys;
    sizes = nextSizes;
    byKey = nextByKey;
    fixedSize = uniform ? estimate : undefined;
    cached = undefined;
  }

  function startOf(index: number): number {
    if (fixedSize !== undefined) return index * fixedSize;
    while (prefix.length <= index) {
      const at = prefix.length - 1;
      prefix.push(prefix[at]! + sizes[at]!);
    }
    return prefix[index]!;
  }

  function totalSize(): number {
    return startOf(count);
  }

  function indexAt(position: number): number {
    if (fixedSize !== undefined) return Math.min(count - 1, Math.floor(position / fixedSize));
    let low = 0;
    let high = count - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (startOf(middle + 1) <= position) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function getWindow(): VirtualWindow {
    if (cached) return cached;
    const total = totalSize();
    const clampedOffset = Math.min(offset, Math.max(0, total - viewportSize));
    let first = 0;
    let last = -1;
    if (count > 0 && viewportSize > 0) {
      first = Math.max(0, indexAt(clampedOffset) - overscan);
      const edge = Math.min(total, clampedOffset + viewportSize);
      let visibleEnd = indexAt(edge);
      if (startOf(visibleEnd) >= edge) visibleEnd -= 1;
      last = Math.min(count - 1, visibleEnd + overscan);
    }
    const items: VirtualItem[] = [];
    for (let index = first; index <= last; index += 1) {
      items.push(
        Object.freeze({ index, key: keys[index]!, start: startOf(index), size: sizes[index]! }),
      );
    }
    const paddingStart = items.length > 0 ? startOf(first) : 0;
    const paddingEnd = items.length > 0 ? Math.max(0, total - startOf(last + 1)) : total;
    cached = Object.freeze({
      items: Object.freeze(items),
      totalSize: total,
      paddingStart,
      paddingEnd,
      startIndex: first,
      endIndex: last,
      offset: clampedOffset,
      viewportSize,
      issues: Object.freeze([...problems.values()]),
    });
    return cached;
  }

  function notify(): void {
    cached = undefined;
    if (listeners.size > 0) {
      const view = getWindow();
      for (const listener of listeners) listener(view);
    }
  }

  configure(initialOptions);
  return {
    setOptions(next) {
      configure(next);
      notify();
    },
    setViewport(nextOffset, nextSize) {
      const issueCount = problems.size;
      const safeOffset = Number.isFinite(nextOffset) && nextOffset >= 0 ? nextOffset : 0;
      const safeSize = Number.isFinite(nextSize) && nextSize >= 0 ? nextSize : 0;
      if (safeOffset !== nextOffset || safeSize !== nextSize) {
        recover(
          "invalid_virtual_viewport",
          "Viewport offset and size must be non-negative and finite; invalid values use 0.",
        );
      }
      if (offset === safeOffset && viewportSize === safeSize && problems.size === issueCount)
        return;
      offset = safeOffset;
      viewportSize = safeSize;
      notify();
    },
    measure(key, size) {
      const index = byKey.get(key);
      if (index === undefined) return;
      if (!Number.isFinite(size) || size <= 0) {
        recover(
          "invalid_virtual_size",
          "Measured size must be positive and finite; the previous size is retained.",
        );
        notify();
        return;
      }
      measured.set(key, size);
      if (sizes[index] === size) return;
      if (fixedSize !== undefined) {
        fixedSize = undefined;
        prefix = [0];
      } else prefix.length = Math.min(prefix.length, index + 1);
      sizes[index] = size;
      notify();
    },
    getWindow,
    getItem(index) {
      return Number.isSafeInteger(index) && index >= 0 && index < count
        ? Object.freeze({ index, key: keys[index]!, start: startOf(index), size: sizes[index]! })
        : undefined;
    },
    getOffsetForIndex(index, align = "auto") {
      if (count === 0) return 0;
      if (!Number.isFinite(index) || !Number.isInteger(index)) {
        recover(
          "invalid_virtual_option",
          "Scroll index must be a finite integer; it is clamped to a valid item.",
        );
      }
      const target = Math.min(
        count - 1,
        Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0),
      );
      const start = startOf(target);
      const end = start + sizes[target]!;
      const current = getWindow().offset;
      let result = start;
      if (align === "center") result = start - (viewportSize - sizes[target]!) / 2;
      else if (align === "end") result = end - viewportSize;
      else if (align === "auto") {
        result =
          start < current ? start : end > current + viewportSize ? end - viewportSize : current;
      }
      return Math.min(Math.max(0, totalSize() - viewportSize), Math.max(0, result));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
