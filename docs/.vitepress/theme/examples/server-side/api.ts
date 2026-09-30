/*
 * A pretend issue tracker API. The 10,000 issues live here, "on the server"; the page only ever
 * receives the one page it asked for. Everything is deterministic, so the server-rendered page and
 * the browser agree, and the same query always takes the same time to answer.
 */

export type IssueState = "open" | "closed";

export interface Issue {
  readonly number: number;
  readonly title: string;
  readonly state: IssueState;
  readonly labels: readonly string[];
  readonly author: string;
  readonly comments: number;
  /** ISO 8601, UTC. */
  readonly updated: string;
}

/** The fields a client may sort by. */
export type IssueSortField = "number" | "title" | "state" | "author" | "comments" | "updated";

export interface IssueQuery {
  readonly page: number;
  readonly size: number;
  /** Sort fields in priority order; a leading `-` means descending. */
  readonly sort: readonly string[];
  readonly q: string;
  readonly state?: IssueState | undefined;
  /** An issue matches when it carries any of these labels. */
  readonly labels: readonly string[];
}

export interface IssuePage {
  readonly rows: readonly Issue[];
  /** Issues matching the query across every page. */
  readonly total: number;
  /** The page actually served, after clamping to the last page. */
  readonly page: number;
  /** Open and closed counts for the same search and labels, like a tracker's tabs. */
  readonly counts: { readonly open: number; readonly closed: number };
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const ISSUE_COUNT = 10_000;
export const LABELS = [
  "bug",
  "enhancement",
  "performance",
  "a11y",
  "docs",
  "regression",
  "good first issue",
] as const;
/** "Now" for the dataset, so relative times read the same on every visit. */
export const NOW: number = Date.UTC(2026, 8, 30, 12, 0, 0);

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

const subjects = [
  "Sticky header",
  "Column resize",
  "Keyboard navigation",
  "CSV export",
  "Row selection",
  "Pagination",
  "Virtual scroller",
  "Search input",
  "Date filter",
  "Nuxt module",
  "Clipboard paste",
  "Dark theme",
  "Undo stack",
  "Column visibility menu",
  "Range filter",
  "Multi-column sort",
];
const problems = [
  "crashes",
  "flickers",
  "loses focus",
  "renders twice",
  "ignores the page size",
  "throws a hydration warning",
  "is slow with 50k rows",
  "reads the wrong value",
  "breaks in Safari",
  "jumps to page 1",
  "announces nothing to screen readers",
  "leaks a listener",
];
const conditions = [
  "after a filter change",
  "on mobile",
  "with nested row keys",
  "inside a dialog",
  "when the data is empty",
  "under SSR",
  "with RTL text",
  "after undo",
  "in manual mode",
  "with a custom cell slot",
];
const requests = ["Support", "Allow", "Expose", "Document", "Add an option for", "Add a slot for"];
const features = [
  "frozen columns",
  "row grouping",
  "an async column filter",
  "per-column debounce",
  "a footer row with totals",
  "saving state to the URL",
  "server-side selection",
  "keyboard shortcuts in the grid",
];
const people = [
  "ada-l",
  "grace-h",
  "linus-t",
  "radia-p",
  "barbara-l",
  "ken-t",
  "margaret-h",
  "edsger-d",
  "donald-k",
  "frances-a",
  "katherine-j",
  "alan-t",
];

function makeIssues(count: number): Issue[] {
  const random = mulberry32(0x5eed);
  const made: Issue[] = [];
  // Newer issues have higher numbers and were updated more recently, give or take.
  for (let index = 0; index < count; index += 1) {
    const number = index + 1;
    const isRequest = random() < 0.3;
    const title = isRequest
      ? `${pick(random, requests)} ${pick(random, features)}`
      : `${pick(random, subjects)} ${pick(random, problems)} ${pick(random, conditions)}`;
    const age = (count - index) / count;
    const state: IssueState = random() < 0.25 + age * 0.55 ? "closed" : "open";
    const labels = new Set<string>([isRequest ? "enhancement" : "bug"]);
    for (const label of LABELS.slice(2)) {
      if (random() < 0.09) {
        labels.add(label);
      }
    }
    const hours = Math.floor(age * 24 * 900 * (0.35 + random() * 0.65));
    made.push({
      number,
      title,
      state,
      labels: [...labels],
      author: pick(random, people),
      comments: Math.floor(random() ** 3 * 60),
      updated: new Date(NOW - hours * 3_600_000 - Math.floor(random() * 3_600_000)).toISOString(),
    });
  }
  return made;
}

let database: readonly Issue[] | undefined;
/** Built on first use, not on import, so pages that never fetch never pay for it. */
function issues(): readonly Issue[] {
  database ??= makeIssues(ISSUE_COUNT);
  return database;
}

/** The query as a URL, the way the browser would send it. */
export function toSearchParams(query: IssueQuery): string {
  const params: [string, string][] = [
    ["page", String(query.page)],
    ["size", String(query.size)],
  ];
  if (query.sort.length > 0) {
    params.push(["sort", query.sort.join(",")]);
  }
  if (query.q) {
    params.push(["q", query.q]);
  }
  if (query.state) {
    params.push(["state", query.state]);
  }
  if (query.labels.length > 0) {
    params.push(["label", query.labels.join(",")]);
  }
  return params
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replaceAll("%2C", ",")}`)
    .join("&");
}

function matchesText(issue: Issue, terms: readonly string[]): boolean {
  if (terms.length === 0) {
    return true;
  }
  const haystack =
    `#${issue.number} ${issue.title} ${issue.author} ${issue.labels.join(" ")}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function compare(left: Issue, right: Issue, field: IssueSortField): number {
  const a = left[field];
  const b = right[field];
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b), "en");
}

const SORTABLE = new Set<string>(["number", "title", "state", "author", "comments", "updated"]);

/** What the server does with a query: search, filter, count, sort, and cut out one page. */
export function runQuery(query: IssueQuery): IssuePage {
  const terms = query.q.toLowerCase().split(/\s+/u).filter(Boolean);
  const labels = new Set(query.labels);
  const matching = issues().filter(
    (issue) =>
      (labels.size === 0 || issue.labels.some((label) => labels.has(label))) &&
      matchesText(issue, terms),
  );
  const counts = { open: 0, closed: 0 };
  for (const issue of matching) {
    counts[issue.state] += 1;
  }
  const filtered = query.state ? matching.filter((issue) => issue.state === query.state) : matching;
  const rules = query.sort
    .map((spec) => ({
      field: spec.replace(/^-/u, "") as IssueSortField,
      sign: spec.startsWith("-") ? -1 : 1,
    }))
    .filter((rule) => SORTABLE.has(rule.field));
  // Newest first unless asked otherwise, and the issue number breaks every tie.
  const sorted = filtered.toSorted((left, right) => {
    for (const { field, sign } of rules) {
      const order = compare(left, right, field) * sign;
      if (order !== 0) {
        return order;
      }
    }
    return right.number - left.number;
  });
  const size = Math.min(Math.max(1, Math.floor(query.size)), 100);
  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const page = Math.min(Math.max(1, Math.floor(query.page)), pageCount);
  return {
    rows: sorted.slice((page - 1) * size, page * size),
    total: sorted.length,
    page,
    counts,
  };
}

/** Between 350 and 700 ms, always the same for the same query. */
export function latencyFor(url: string): number {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash = Math.imul(hash ^ url.charCodeAt(index), 16777619);
  }
  return 350 + ((hash >>> 0) % 351);
}

function abortError(): DOMException {
  return new DOMException("The request was aborted.", "AbortError");
}

export interface FetchOptions {
  readonly signal?: AbortSignal | undefined;
  /** Answer with a 500 instead of the page, to try the error path. */
  readonly fail?: boolean | undefined;
}

/**
 * `GET /api/issues?…`. Resolves after a simulated round trip, rejects with an `AbortError` as soon
 * as the signal aborts, and with an {@link HttpError} when asked to fail.
 */
export function fetchPage(
  query: IssueQuery,
  { signal, fail }: FetchOptions = {},
): Promise<IssuePage> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener("abort", onAbort);
        if (fail) {
          reject(new HttpError(500, "Internal Server Error"));
          return;
        }
        resolve(runQuery(query));
      },
      latencyFor(toSearchParams(query)),
    );
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
