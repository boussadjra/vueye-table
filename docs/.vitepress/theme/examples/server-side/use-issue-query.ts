import { onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref, type ShallowRef } from "vue";
import type { SortRule } from "vueye-table";

import { fetchPage, toSearchParams, type Issue, type IssueQuery, type IssueState } from "./api";

export type RequestStatus = "pending" | 200 | 500 | "aborted";

/** One line of the network log. */
export interface RequestEntry {
  readonly id: number;
  readonly url: string;
  readonly status: RequestStatus;
  /** Milliseconds from start to answer, or to abort. */
  readonly duration?: number | undefined;
  readonly rows?: number | undefined;
}

export interface IssueQueryState {
  /** Bound to the table with `v-model`: the table changes them, a request follows. */
  readonly page: Ref<number>;
  readonly pageSize: Ref<number>;
  readonly sorting: Ref<readonly SortRule[]>;
  readonly search: Ref<string>;
  readonly filters: Ref<Readonly<Record<string, unknown>>>;
  /** What the server sent last. Kept while the next page loads. */
  readonly rows: ShallowRef<readonly Issue[]>;
  readonly total: Ref<number | undefined>;
  readonly counts: Ref<{ readonly open: number; readonly closed: number } | undefined>;
  readonly loading: Ref<boolean>;
  readonly error: Ref<string | undefined>;
  readonly requests: ShallowRef<readonly RequestEntry[]>;
  /** Make the next request answer 500. */
  readonly failNext: Ref<boolean>;
  retry(): void;
}

const SEARCH_DEBOUNCE = 300;
const LOG_LIMIT = 40;

/** `[{ column: "updated", direction: "desc" }]` becomes `["-updated"]`. */
function toSort(sorting: readonly SortRule[]): string[] {
  return sorting.map((rule) => (rule.direction === "desc" ? "-" : "") + rule.column);
}

function isAbort(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === "AbortError";
}

/**
 * Table state in, one page of issues out. Every change to the state sends one request; a newer
 * request aborts the one in flight, and typing in the search box waits for a pause first.
 */
export function useIssueQuery(): IssueQueryState {
  const page = ref(1);
  const pageSize = ref(25);
  const sorting = ref<readonly SortRule[]>([{ column: "updated", direction: "desc" }]);
  const search = ref("");
  const filters = ref<Readonly<Record<string, unknown>>>({ state: "open" });

  const rows = shallowRef<readonly Issue[]>([]);
  const total = ref<number>();
  const counts = ref<{ readonly open: number; readonly closed: number }>();
  // True from the start, so the server-rendered page already shows the loading state.
  const loading = ref(true);
  const error = ref<string>();
  const requests = shallowRef<readonly RequestEntry[]>([]);
  const failNext = ref(false);

  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sentSearch = "";
  let lastUrl = "";
  let sequence = 0;

  function currentQuery(): IssueQuery {
    const state = filters.value["state"] as IssueState | undefined;
    const labels = (filters.value["labels"] as readonly string[] | undefined) ?? [];
    return {
      page: page.value,
      size: pageSize.value,
      sort: toSort(sorting.value),
      q: search.value.trim(),
      state,
      labels,
    };
  }

  function record(entry: RequestEntry): void {
    requests.value = [entry, ...requests.value.filter((line) => line.id !== entry.id)].slice(
      0,
      LOG_LIMIT,
    );
  }

  async function load(force = false): Promise<void> {
    clearTimeout(timer);
    sentSearch = search.value;
    const query = currentQuery();
    const url = `/api/issues?${toSearchParams(query)}`;
    // The same question twice in a row, such as a keystroke undone, needs no second answer.
    if (!force && url === lastUrl) {
      return;
    }
    lastUrl = url;

    controller?.abort();
    const own = new AbortController();
    controller = own;
    const id = (sequence += 1);
    const started = performance.now();
    const fail = failNext.value;
    failNext.value = false;
    record({ id, url, status: "pending" });
    loading.value = true;

    try {
      const result = await fetchPage(query, { signal: own.signal, fail });
      record({
        id,
        url,
        status: 200,
        duration: performance.now() - started,
        rows: result.rows.length,
      });
      error.value = undefined;
      rows.value = result.rows;
      total.value = result.total;
      counts.value = result.counts;
      if (result.page !== query.page) {
        // The server clamped a page past the end; follow it without asking again.
        lastUrl = `/api/issues?${toSearchParams({ ...query, page: result.page })}`;
        page.value = result.page;
      }
    } catch (reason) {
      const aborted = isAbort(reason);
      record({ id, url, status: aborted ? "aborted" : 500, duration: performance.now() - started });
      if (!aborted) {
        error.value = reason instanceof Error ? reason.message : String(reason);
        // Let the same query be asked again.
        lastUrl = "";
      }
    } finally {
      if (controller === own) {
        controller = undefined;
        loading.value = false;
      }
    }
  }

  watch([page, pageSize, sorting, search, filters], () => {
    if (search.value !== sentSearch) {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), SEARCH_DEBOUNCE);
      return;
    }
    void load();
  });

  // Requests start in the browser only.
  onMounted(() => void load());
  onBeforeUnmount(() => {
    clearTimeout(timer);
    controller?.abort();
  });

  return {
    page,
    pageSize,
    sorting,
    search,
    filters,
    rows,
    total,
    counts,
    loading,
    error,
    requests,
    failNext,
    retry: () => void load(true),
  };
}
