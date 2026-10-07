import type { RowKey } from "./state";

/** Every problem the engine can report. The union grows in minor versions. */
export type TableIssueCode =
  | "duplicate_row_key"
  | "unknown_column"
  | "invalid_page_size"
  | "unknown_row"
  | "read_only_cell"
  | "invalid_value"
  | "unsafe_path"
  | "paste_truncated"
  | "invalid_paste_limit";

/**
 * A problem the engine recovered from. Invalid input is never dropped silently: the engine falls
 * back to something safe and reports what it did here.
 */
export interface TableIssue {
  readonly code: TableIssueCode;
  readonly message: string;
  readonly column?: string | undefined;
  readonly rowKey?: RowKey | undefined;
}

export function issue(
  code: TableIssueCode,
  message: string,
  details: { readonly column?: string | undefined; readonly rowKey?: RowKey | undefined } = {},
): TableIssue {
  return Object.freeze({ code, message, ...details });
}
