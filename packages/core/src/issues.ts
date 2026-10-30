import type { RowKey } from "./state";

/** Every problem the engine can report. The union grows in minor versions. */
export type TableIssueCode =
  | "stream_error"
  | "invalid_stream_option"
  | "ingestion_conflict"
  | "invalid_ingestion"
  | "duplicate_row_key"
  | "unknown_column"
  | "invalid_page_size"
  | "invalid_column_size"
  | "column_not_resizable"
  | "invalid_column_pinning"
  | "column_not_pinnable"
  | "duplicate_column_pin"
  | "unsized_pinned_column"
  | "unknown_row"
  | "read_only_cell"
  | "invalid_value"
  | "validation_failed"
  | "stale_draft"
  | "invalid_row_operation"
  | "invalid_expanded"
  | "invalid_grouping"
  | "invalid_expanded_groups"
  | "column_not_groupable"
  | "invalid_group_value"
  | "group_value_error"
  | "aggregate_error"
  | "grouping_with_tree"
  | "unsafe_path"
  | "paste_truncated"
  | "invalid_paste_limit"
  | "invalid_virtual_option"
  | "invalid_virtual_size"
  | "invalid_virtual_viewport"
  | "duplicate_virtual_key"
  | "tree_cycle"
  | "tree_depth_exceeded"
  | "tree_orphan"
  | "tree_duplicate_key"
  | "tree_load_error"
  | "invalid_tree_option";

/**
 * A problem the engine recovered from. Invalid input is never dropped silently: the engine falls
 * back to something safe and reports what it did here.
 */
export interface TableIssue {
  readonly code: TableIssueCode;
  readonly message: string;
  readonly column?: string | undefined;
  readonly rowKey?: RowKey | undefined;
  readonly validationCode?: string | undefined;
}

export function issue(
  code: TableIssueCode,
  message: string,
  details: {
    readonly column?: string | undefined;
    readonly rowKey?: RowKey | undefined;
    readonly validationCode?: string | undefined;
  } = {},
): TableIssue {
  return Object.freeze({ code, message, ...details });
}
