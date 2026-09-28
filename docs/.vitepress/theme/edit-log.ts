import { ref, shallowRef, type Ref, type ShallowRef } from "vue";
import { toA1, type CellChange } from "vueye-table";

/** One cell edit, as a spreadsheet reported it through its `edit` event. */
export interface EditEntry {
  readonly id: number;
  readonly reference: string;
  readonly column: string;
  readonly previous: string;
  readonly value: string;
}

export interface EditLog<TRow> {
  readonly rows: ShallowRef<readonly TRow[]>;
  /** The latest edits, newest first. */
  readonly edits: ShallowRef<readonly EditEntry[]>;
  /** How many new arrays `update:data` has delivered. */
  readonly arrays: Ref<number>;
  readonly csv: Ref<string>;
  readonly onData: (next: readonly unknown[]) => void;
  readonly onEdit: (changes: readonly CellChange<unknown>[]) => void;
  readonly onExport: (text: string) => void;
}

function show(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : String(value);
}

/**
 * Holds a spreadsheet's rows and its latest edits with their A1 addresses. The rows start as the
 * array passed in, and every change replaces that array instead of changing it.
 */
export function useEditLog<TRow extends { readonly id: number }>(
  initial: readonly TRow[],
  columnIds: readonly string[],
  limit = 5,
): EditLog<TRow> {
  const rows = shallowRef<readonly TRow[]>(initial);
  const edits = shallowRef<readonly EditEntry[]>([]);
  const arrays = ref(0);
  const csv = ref("");
  let count = 0;

  return {
    rows,
    edits,
    arrays,
    csv,
    onData(next) {
      rows.value = next as readonly TRow[];
      arrays.value += 1;
    },
    onEdit(changes) {
      const entries = changes.map((change) => {
        count += 1;
        return {
          id: count,
          reference: toA1({
            row: Math.max(
              0,
              rows.value.findIndex((row) => row.id === change.rowKey),
            ),
            column: Math.max(0, columnIds.indexOf(change.column)),
          }),
          column: change.column,
          previous: show(change.previous),
          value: show(change.value),
        };
      });
      edits.value = [...entries.toReversed(), ...edits.value].slice(0, limit);
    },
    onExport(text) {
      csv.value = text;
    },
  };
}
