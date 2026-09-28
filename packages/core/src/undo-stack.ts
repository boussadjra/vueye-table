/**
 * An undo stack of batches. Recording a batch clears whatever could be redone, and the stack
 * keeps at most `limit` batches, dropping the oldest.
 */
export interface UndoStack<TEntry> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  record(entry: TEntry): void;
  /** Take the most recent batch to undo, if any. */
  undo(): TEntry | undefined;
  /** Take the most recently undone batch to redo, if any. */
  redo(): TEntry | undefined;
  clear(): void;
}

export function createUndoStack<TEntry>(limit = 100): UndoStack<TEntry> {
  const past: TEntry[] = [];
  const future: TEntry[] = [];
  return {
    get canUndo(): boolean {
      return past.length > 0;
    },
    get canRedo(): boolean {
      return future.length > 0;
    },
    record(entry: TEntry): void {
      past.push(entry);
      if (past.length > limit) {
        past.shift();
      }
      future.length = 0;
    },
    undo(): TEntry | undefined {
      const entry = past.pop();
      if (entry !== undefined) {
        future.push(entry);
      }
      return entry;
    },
    redo(): TEntry | undefined {
      const entry = future.pop();
      if (entry !== undefined) {
        past.push(entry);
      }
      return entry;
    },
    clear(): void {
      past.length = 0;
      future.length = 0;
    },
  };
}
