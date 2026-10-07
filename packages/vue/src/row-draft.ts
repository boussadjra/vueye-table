import type {
  CellEdit,
  DataTable,
  DeepKeys,
  EditResult,
  PathValue,
  RowKey,
  TableIssue,
} from "@vueye-table/core";
import { shallowReactive, shallowRef, toRaw } from "vue";

/** A column-value bag. Only configured columns are present; dotted paths stay dotted keys. */
export type RowDraftValues<TRow> = {
  -readonly [P in DeepKeys<TRow>]?: PathValue<TRow, P>;
};

export interface RowDraft<TRow> {
  readonly rowKey: RowKey;
  readonly values: RowDraftValues<TRow>;
  readonly issues: readonly TableIssue[];
  readonly status: "editing" | "saving" | "saved" | "cancelled" | "stale";
  readonly pending: boolean;
  /** Supply raw text for the column parser, including numeric/date input. */
  setInput(column: string, input: string): void;
  /** Set a computed column whose id is not a path in the row type. */
  setValue(column: string, value: unknown): void;
  save(): Promise<EditResult<TRow>>;
  /** Discard an unsubmitted draft. A submitted validation batch is owned by the engine. */
  cancel(): boolean;
}

export function rejectedDraft<TRow>(rowKey: RowKey, message: string): EditResult<TRow> {
  return refused([Object.freeze({ code: "stale_draft", rowKey, message })]);
}

function refused<TRow>(issues: readonly TableIssue[]): EditResult<TRow> {
  return Object.freeze({
    status: "rejected",
    changes: Object.freeze([]),
    rowChanges: Object.freeze([]),
    pendingCells: Object.freeze([]),
    issues: Object.freeze([...issues]),
  });
}

// Compare owned structured values without making nested values reactive. Cycles are allowed.
function equal(left: unknown, right: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (left instanceof Date || right instanceof Date)
    return (
      left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime())
    );
  if (Array.isArray(left) && Array.isArray(right) && left.length !== right.length) return false;
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;
  if (seen.has(left)) return seen.get(left) === right;
  seen.set(left, right);
  if (left instanceof Map && right instanceof Map) return equal([...left], [...right], seen);
  if (left instanceof Set && right instanceof Set) return equal([...left], [...right], seen);
  if (left instanceof RegExp && right instanceof RegExp)
    return left.source === right.source && left.flags === right.flags;
  if (left instanceof ArrayBuffer && right instanceof ArrayBuffer)
    return equal([...new Uint8Array(left)], [...new Uint8Array(right)], seen);
  if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right))
    return equal(
      [...new Uint8Array(left.buffer, left.byteOffset, left.byteLength)],
      [...new Uint8Array(right.buffer, right.byteOffset, right.byteLength)],
      seen,
    );
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) && equal(Reflect.get(left, key), Reflect.get(right, key), seen),
    )
  );
}

/** Internal factory; disposal is shared with the binding's single engine subscription. */
export function createRowDraft<TRow>(
  table: DataTable<TRow>,
  key: RowKey,
  register: (dispose: () => void) => () => void,
): RowDraft<TRow> {
  const snapshot = table.getSnapshot();
  const original = snapshot.getRow(key)?.original;
  const columns = snapshot.allColumns;
  const values = shallowReactive<Record<string, unknown>>(Object.create(null));
  const initial = new Map<string, unknown>();
  const inputs = new Map<string, string>();
  const copyIssues = new Map<string, TableIssue>();
  const issues = shallowRef<readonly TableIssue[]>([]);
  const status = shallowRef<RowDraft<TRow>["status"]>("editing");
  for (const column of columns) {
    if (original === undefined) break;
    try {
      if (!column.isEditable(original)) continue;
      const value = column.getValue(original);
      initial.set(column.id, value);
      values[column.id] = structuredClone(toRaw(value));
    } catch {
      copyIssues.set(
        column.id,
        Object.freeze({
          code: "invalid_value",
          rowKey: key,
          column: column.id,
          message:
            "This value cannot be copied into a row draft. Replace it explicitly before saving.",
        }),
      );
      issues.value = [...copyIssues.values()];
    }
  }
  let saving: Promise<EditResult<TRow>> | undefined;
  let disposePending: ((result: EditResult<TRow>) => void) | undefined;
  let disposed = false;
  const stale = (): EditResult<TRow> =>
    rejectedDraft(key, "This draft is closed, or its row or columns changed. Open a new draft.");
  const unregister = register(() => {
    disposed = true;
    const result = stale();
    status.value = "stale";
    issues.value = result.issues;
    disposePending?.(result);
  });
  const draft: RowDraft<TRow> = {
    rowKey: key,
    values,
    get issues() {
      return issues.value;
    },
    get status() {
      return status.value;
    },
    get pending() {
      return status.value === "saving";
    },
    setInput(column, input) {
      if (status.value === "editing") inputs.set(column, input);
    },
    setValue(column, value) {
      if (status.value === "editing") {
        values[column] = value;
        inputs.delete(column);
      }
    },
    save() {
      if (saving) return saving;
      if (
        status.value !== "editing" ||
        disposed ||
        original === undefined ||
        table.getSnapshot().getRow(key)?.original !== original ||
        columns.some(
          (column) => table.getSnapshot().getColumn(column.id)?.definition !== column.definition,
        )
      ) {
        const result = stale();
        issues.value = result.issues;
        status.value = "stale";
        unregister();
        return Promise.resolve(result);
      }
      const edits: CellEdit[] = [];
      const uncopied = [...copyIssues.values()].filter(
        (problem) => !Object.hasOwn(values, problem.column!) && !inputs.has(problem.column!),
      );
      if (uncopied.length) {
        issues.value = Object.freeze(uncopied);
        return Promise.resolve(refused(issues.value));
      }
      for (const column of new Set([...Object.keys(values), ...inputs.keys()])) {
        try {
          const value = toRaw(values[column]);
          if (inputs.has(column)) edits.push({ rowKey: key, column, input: inputs.get(column)! });
          else if (!initial.has(column) || !equal(value, initial.get(column))) {
            edits.push(
              typeof value === "string"
                ? { rowKey: key, column, input: value }
                : {
                    rowKey: key,
                    column,
                    value:
                      value !== null && typeof value === "object" ? structuredClone(value) : value,
                  },
            );
          }
        } catch {
          issues.value = Object.freeze([
            Object.freeze({
              code: "invalid_value",
              rowKey: key,
              column,
              message:
                "This draft value cannot be copied for submission. Replace it before saving.",
            }),
          ]);
          return Promise.resolve(refused(issues.value));
        }
      }
      status.value = "saving";
      const result = table.edit(edits, { expectedRows: new Map([[key, original]]) });
      if (disposed) return Promise.resolve(stale());
      const cancelled = new Promise<EditResult<TRow>>((resolve) => {
        disposePending = resolve;
      });
      saving = Promise.race([result.completion ?? Promise.resolve(result), cancelled]).then(
        (final) => {
          issues.value = final.issues;
          // Partial results close the draft too: accepted fields have already changed the row.
          status.value =
            disposed || final.issues.some((problem) => problem.code === "stale_draft")
              ? "stale"
              : final.status === "rejected"
                ? "editing"
                : "saved";
          if (status.value !== "editing") unregister();
          saving = undefined;
          disposePending = undefined;
          return final;
        },
      );
      return saving;
    },
    cancel() {
      if (status.value !== "editing") return false;
      status.value = "cancelled";
      unregister();
      return true;
    },
  };
  return Object.freeze(draft);
}
