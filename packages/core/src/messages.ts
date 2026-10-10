import type { LoadState } from "./stream";

/**
 * A number as a message receives it: the value, to choose a plural form, and the text the
 * locale writes it as (`10,000` in English, `10 000` in French).
 */
export interface Count {
  readonly value: number;
  readonly text: string;
}

/** Where the status line stands: "26–50 of 10,000 rows, 2 selected". */
export interface RangeParts {
  readonly start: Count;
  readonly end: Count;
  readonly total: Count;
  readonly selected: Count;
}

/** Where incremental loading stands: "Loaded 1,200 rows. All rows loaded." */
export interface LoadedParts {
  readonly loaded: Count;
  readonly state: LoadState;
}

/** The next sort a header button applies when pressed. */
export type SortStep = "ascending" | "descending" | "unsorted";

/**
 * Every word the components show or announce. A host passes its own, in its own language, through
 * the `messages` option of a table, a grid or the plugin; whatever it leaves out keeps the English
 * default. Functions receive counts already written in the table's locale.
 */
export interface TableMessages {
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly columns: string;
  readonly rowsPerPage: string;
  readonly pagination: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly page: (page: Count) => string;
  readonly noMatchingRows: string;
  readonly noRows: string;
  readonly loading: string;
  readonly loadingRows: string;
  readonly loadingMoreRows: string;
  readonly loadMoreRows: string;
  readonly retryLoading: string;
  readonly couldNotLoadRows: string;
  readonly rangeStatus: (parts: RangeParts) => string;
  readonly loadedStatus: (parts: LoadedParts) => string;
  readonly loadingChildren: string;
  readonly childrenError: string;
  readonly retryChildren: string;
  readonly sortBy: (header: string, next: SortStep) => string;
  readonly selectAllRows: string;
  readonly selectRow: (row: { readonly position: Count }) => string;
  readonly rowActions: string;
  readonly details: string;
  readonly rowNumber: string;
  readonly addRow: string;
  readonly expandRow: string;
  readonly collapseRow: string;
  readonly actions: string;
  readonly actionsForRow: (row: string) => string;
  readonly rowActionsFor: (row: string) => string;
  readonly editRow: string;
  readonly saveRow: string;
  readonly cancel: string;
  readonly revertRow: string;
  readonly removeRow: string;
  readonly actionOnRow: (action: string, row: string) => string;
  readonly editCell: (header: string) => string;
  readonly searchOptions: (header: string) => string;
  readonly optionCount: (count: Count) => string;
  readonly noMatchingOptions: string;
  readonly firstMatchesOnly: (count: Count) => string;
  readonly emptyOption: string;
  readonly spreadsheet: string;
  readonly undo: string;
  readonly redo: string;
  readonly exportCsv: string;
}

const rows = (count: Count): string => `${count.text} ${count.value === 1 ? "row" : "rows"}`;

/** The English words, the default of every table. */
export const defaultTableMessages: TableMessages = Object.freeze({
  search: "Search",
  searchPlaceholder: "Search…",
  columns: "Columns",
  rowsPerPage: "Rows per page",
  pagination: "Pagination",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: (page: Count) => `Page ${page.text}`,
  noMatchingRows: "No matching rows",
  noRows: "No rows",
  loading: "Loading…",
  loadingRows: "Loading rows…",
  loadingMoreRows: "Loading more rows…",
  loadMoreRows: "Load more rows",
  retryLoading: "Retry loading",
  couldNotLoadRows: "Could not load rows.",
  rangeStatus: ({ start, end, total, selected }: RangeParts) =>
    `${start.text}–${end.text} of ${rows(total)}` +
    (selected.value > 0 ? `, ${selected.text} selected` : ""),
  loadedStatus: ({ loaded, state }: LoadedParts) => {
    const count = `Loaded ${rows(loaded)}`;
    if (state === "error") return `${count}. Could not load rows. Retry loading.`;
    if (state === "aborted") return `${count}. Loading stopped.`;
    if (state === "loading" || state === "streaming") return `${count}…`;
    return `${count}${state === "done" ? ". All rows loaded." : "."}`;
  },
  loadingChildren: "Loading children…",
  childrenError: "Could not load children. Retry children in the affected row.",
  retryChildren: "Retry children",
  sortBy: (header: string, next: SortStep) => `${header}, sort ${next}`,
  selectAllRows: "Select all rows",
  selectRow: ({ position }: { readonly position: Count }) => `Select row ${position.text}`,
  rowActions: "Row actions",
  details: "Details",
  rowNumber: "Row number",
  addRow: "Add row",
  expandRow: "Expand row",
  collapseRow: "Collapse row",
  actions: "Actions",
  actionsForRow: (row: string) => `Actions for row ${row}`,
  rowActionsFor: (row: string) => `Row ${row} actions`,
  editRow: "Edit row",
  saveRow: "Save row",
  cancel: "Cancel",
  revertRow: "Revert row",
  removeRow: "Remove row",
  actionOnRow: (action: string, row: string) => `${action}, row ${row}`,
  editCell: (header: string) => `Edit ${header}`,
  searchOptions: (header: string) => `Search ${header} options`,
  optionCount: (count: Count) => `${count.text} options`,
  noMatchingOptions: "No matching options. Change your search.",
  firstMatchesOnly: (count: Count) =>
    `Showing the first ${count.text} matches. Refine your search.`,
  emptyOption: "(empty)",
  spreadsheet: "Spreadsheet",
  undo: "Undo",
  redo: "Redo",
  exportCsv: "Export CSV",
});

/** A number written in a locale, with its value kept for plural choices. */
export function formatCount(value: number, locale?: string): Count {
  return { value, text: new Intl.NumberFormat(locale).format(value) };
}

/** The words a table speaks: the host's, then the defaults for whatever it leaves out. */
export function resolveTableMessages(messages?: Partial<TableMessages>): TableMessages {
  if (!messages) return defaultTableMessages;
  const defined = Object.fromEntries(
    Object.entries(messages).filter(([, value]) => value !== undefined),
  ) as Partial<TableMessages>;
  return Object.freeze({ ...defaultTableMessages, ...defined });
}
