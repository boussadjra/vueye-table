import type { TableColumn } from "./column";
import { issue, type TableIssue } from "./issues";
import { isSafePath } from "./path";
import type { TableRow } from "./row";
import type { RowKey } from "./state";
import type {
  CellChange,
  CellEdit,
  CellValueEdit,
  EditOptions,
  EditResult,
  TableSnapshot,
} from "./table";
import {
  editorFailure,
  isPromise,
  runValidation,
  type PendingCell,
  type ValidationResult,
} from "./validation";

interface Candidate<TRow> {
  readonly edit: CellValueEdit;
  readonly previous: unknown;
  readonly original: TRow;
  readonly column: TableColumn<TRow>;
  readonly validation: TableIssue | undefined | Promise<TableIssue | undefined>;
  readonly token: object;
  readonly guard: { row: TRow } | undefined;
}
export interface ValidationHost<TRow> {
  snapshot(): TableSnapshot<TRow>;
  apply(
    edits: readonly CellEdit[],
    record: boolean,
    issues?: readonly TableIssue[],
  ): EditResult<TRow>;
  record(changes: readonly CellChange<TRow>[]): void;
  notify(): void;
  batch(run: () => EditResult<TRow>): EditResult<TRow>;
  writeIssue(row: TableRow<TRow>, next: TRow): TableIssue | undefined;
  onIssues(issues: readonly TableIssue[]): void;
  readonly optimistic: boolean;
  readonly validateRow:
    | ((next: TRow, previous: TRow) => ValidationResult | Promise<ValidationResult>)
    | undefined;
}

export function readonlyMap<TKey, TValue>(
  source: ReadonlyMap<TKey, TValue>,
): ReadonlyMap<TKey, TValue> {
  const copy = new Map(source);
  const result: ReadonlyMap<TKey, TValue> = {
    size: copy.size,
    get: (key) => copy.get(key),
    has: (key) => copy.has(key),
    entries: () => copy.entries(),
    keys: () => copy.keys(),
    values: () => copy.values(),
    [Symbol.iterator]: () => copy[Symbol.iterator](),
    forEach(callback, thisArg) {
      copy.forEach((value, key) => callback.call(thisArg, value, key, result));
    },
  };
  return Object.freeze(result);
}

/** All promises in one edit settle together. Tokens fence every cell against stale results. */
export function createEditValidation<TRow>(host: ValidationHost<TRow>): {
  edit(
    edits: readonly CellEdit[],
    recovered?: readonly TableIssue[],
    options?: EditOptions<TRow>,
  ): EditResult<TRow>;
  cells(): readonly PendingCell[];
  hasPending(key: RowKey): boolean;
  problems(): ReadonlyMap<RowKey, ReadonlyMap<string, TableIssue>>;
  cancel(keys?: readonly RowKey[]): void;
} {
  const tokens = new Map<RowKey, Map<string, object>>();
  const pending = new Map<RowKey, Map<string, PendingCell>>();
  const problems = new Map<RowKey, Map<string, TableIssue>>();
  const current = (candidate: Candidate<TRow>): boolean =>
    tokens.get(candidate.edit.rowKey)?.get(candidate.edit.column) === candidate.token;
  const fresh = (candidate: Candidate<TRow>): boolean =>
    !candidate.guard ||
    host.snapshot().getRow(candidate.edit.rowKey)?.original === candidate.guard.row;
  const tokenFor = (rowKey: RowKey, column: string): object => {
    const row = tokens.get(rowKey) ?? new Map<string, object>();
    const token = {};
    row.set(column, token);
    tokens.set(rowKey, row);
    pending.get(rowKey)?.delete(column);
    problems.get(rowKey)?.delete(column);
    return token;
  };
  const setIssues = (issues: readonly TableIssue[]): void => {
    for (const problem of issues) {
      if (problem.rowKey === undefined || problem.column === undefined) continue;
      const row = problems.get(problem.rowKey) ?? new Map<string, TableIssue>();
      row.set(problem.column, problem);
      problems.set(problem.rowKey, row);
    }
  };
  function rowValidation(
    candidates: readonly Candidate<TRow>[],
    failures: TableIssue[],
  ): Candidate<TRow>[] | Promise<Candidate<TRow>[]> {
    if (!host.validateRow) return [...candidates];
    const rows = new Map<RowKey, Candidate<TRow>[]>();
    for (const candidate of candidates) {
      const group = rows.get(candidate.edit.rowKey) ?? [];
      group.push(candidate);
      rows.set(candidate.edit.rowKey, group);
    }
    const results: (Candidate<TRow>[] | Promise<Candidate<TRow>[]>)[] = [];
    for (const [key, group] of rows) {
      const previous = group[0]!.original;
      let next = previous;
      try {
        for (const candidate of group)
          next = candidate.column.setValue(next, candidate.edit.value) ?? next;
      } catch (error) {
        for (const candidate of group)
          failures.push(
            issue("validation_failed", String(error), {
              rowKey: key,
              column: candidate.edit.column,
            }),
          );
        continue;
      }
      const validation = runValidation(() => host.validateRow!(next, previous), key);
      const accept = (problem: TableIssue | undefined): Candidate<TRow>[] => {
        if (!problem) return group;
        for (const candidate of group)
          if (current(candidate))
            failures.push(Object.freeze({ ...problem, column: candidate.edit.column }));
        return [];
      };
      results.push(isPromise(validation) ? validation.then(accept) : accept(validation));
    }
    return results.some(isPromise)
      ? Promise.all(results.map((result) => Promise.resolve(result))).then((groups) =>
          groups.flat(),
        )
      : (results as Candidate<TRow>[][]).flat();
  }
  function settle(
    accepted: readonly Candidate<TRow>[],
    all: readonly Candidate<TRow>[],
    failures: readonly TableIssue[],
    asynchronous: boolean,
  ): EditResult<TRow> {
    return host.batch(() => {
      const live = accepted.filter((candidate) => current(candidate) && fresh(candidate));
      const liveKeys = new Set(live);
      const active = all.filter(current);
      for (const candidate of active) {
        const key = candidate.edit.rowKey;
        pending.get(key)?.delete(candidate.edit.column);
        if (pending.get(key)?.size === 0) pending.delete(key);
      }
      const visibleFailures = failures;
      setIssues(visibleFailures);
      let result: EditResult<TRow>;
      if (asynchronous && host.optimistic) {
        const rollback = active
          .filter((candidate) => !liveKeys.has(candidate))
          .map((candidate) => ({ ...candidate.edit, value: candidate.previous }));
        result = host.apply(rollback, false, visibleFailures);
        const changes = live.map((candidate) =>
          Object.freeze({
            rowKey: candidate.edit.rowKey,
            column: candidate.edit.column,
            previous: candidate.previous,
            value: candidate.edit.value,
            row: host.snapshot().getRow(candidate.edit.rowKey)!.original,
          }),
        );
        if (changes.length) host.record(changes);
        result = Object.freeze({
          ...result,
          changes: Object.freeze(changes),
          status: changes.length
            ? visibleFailures.length
              ? "partial"
              : "applied"
            : visibleFailures.length
              ? "rejected"
              : "unchanged",
        });
      } else
        result = host.apply(
          live.map((candidate) => candidate.edit),
          true,
          visibleFailures,
        );
      setIssues(result.issues);
      if (
        (!result.changes.length && (all.length || result.issues.length)) ||
        (asynchronous && host.optimistic)
      )
        host.notify();
      if (asynchronous && !result.issues.length && active.length) host.onIssues([]);
      return result;
    });
  }
  return {
    hasPending: (key) => (pending.get(key)?.size ?? 0) > 0,
    cells: () => Object.freeze([...pending.values()].flatMap((row) => [...row.values()])),
    problems: () =>
      new Map(
        [...problems].filter(([, row]) => row.size).map(([key, row]) => [key, readonlyMap(row)]),
      ),
    cancel(keys) {
      if (!keys) {
        tokens.clear();
        pending.clear();
        problems.clear();
      } else
        for (const key of keys) {
          tokens.delete(key);
          pending.delete(key);
          problems.delete(key);
        }
    },
    edit(edits, recovered = [], options) {
      const metadataChanged = edits.some(
        (edit) =>
          pending.get(edit.rowKey)?.has(edit.column) ||
          problems.get(edit.rowKey)?.has(edit.column) ||
          (host.validateRow && pending.get(edit.rowKey)?.size),
      );
      const snapshot = host.snapshot();
      const failures = [...recovered];
      const candidates: Candidate<TRow>[] = [];
      const guards = new Map(
        [...(options?.expectedRows ?? [])].map(([key, row]) => [key, { row }]),
      );
      const drafts = new Map<RowKey, TRow>();
      const samples = new Map<string, unknown>();
      if (host.validateRow)
        for (const key of new Set(edits.map((edit) => edit.rowKey))) {
          tokens.delete(key);
          pending.delete(key);
        }
      for (const edit of edits) {
        const token = tokenFor(edit.rowKey, edit.column);
        const row: TableRow<TRow> | undefined = snapshot.getRow(edit.rowKey);
        const column = snapshot.getColumn(edit.column);
        const fail = (code: TableIssue["code"], message: string): void => {
          failures.push(issue(code, message, { rowKey: edit.rowKey, column: edit.column }));
        };
        if (!isSafePath(edit.column)) {
          fail("unsafe_path", "This path addresses a prototype and cannot be written.");
          continue;
        }
        if (!row) {
          fail("unknown_row", `No row has the key "${String(edit.rowKey)}".`);
          continue;
        }
        const guard = guards.get(row.key);
        if (guard && row.original !== guard.row) {
          fail("stale_draft", "The row changed after this draft was opened.");
          continue;
        }
        if (!column) {
          fail("unknown_column", `No column has the id "${edit.column}".`);
          continue;
        }
        const original = drafts.get(row.key) ?? row.original;
        try {
          if (!column.isEditable(original)) {
            fail("read_only_cell", `The "${column.id}" cell is read-only.`);
            continue;
          }
          let value: unknown;
          if ("input" in edit) {
            if (!samples.has(column.id))
              samples.set(
                column.id,
                snapshot.processedRows
                  .find(
                    (candidate) =>
                      candidate.getValue(column.id) !== null &&
                      candidate.getValue(column.id) !== undefined,
                  )
                  ?.getValue(column.id),
              );
            const parsed = column.parse(edit.input, original, samples.get(column.id));
            if (!parsed.ok) {
              fail("invalid_value", parsed.message);
              continue;
            }
            value = parsed.value;
          } else value = edit.value;
          const previous = column.getValue(original);
          if (Object.is(previous, value)) continue;
          const constraint = editorFailure(column.definition.editor, value);
          if (constraint) {
            fail("validation_failed", constraint);
            continue;
          }
          const next = column.setValue(original, value);
          if (next === undefined) {
            fail("read_only_cell", "The column has no way to write a value.");
            continue;
          }
          const writeProblem = host.writeIssue(row, next);
          if (writeProblem) {
            failures.push(Object.freeze({ ...writeProblem, column: column.id }));
            continue;
          }
          const validate = column.definition.validate;
          const validation = validate
            ? runValidation(() => validate(value as never, row.original), row.key, column.id)
            : undefined;
          if (validation && !isPromise(validation)) {
            failures.push(validation);
            continue;
          }
          drafts.set(row.key, next);
          candidates.push({
            edit: { rowKey: row.key, column: column.id, value },
            previous: column.getValue(row.original),
            original: row.original,
            column,
            validation,
            token,
            guard,
          });
        } catch (error) {
          fail("invalid_value", error instanceof Error ? error.message : String(error));
        }
      }
      const asynchronous = candidates.some((candidate) => isPromise(candidate.validation));
      const validateRows = (
        accepted: Candidate<TRow>[],
      ): Candidate<TRow>[] | Promise<Candidate<TRow>[]> =>
        rowValidation(
          accepted.filter((candidate) => current(candidate) && fresh(candidate)),
          failures,
        );
      const outcome = asynchronous
        ? Promise.all(
            candidates.map(async (candidate) => {
              const problem = await candidate.validation;
              if (problem) {
                if (current(candidate)) failures.push(problem);
                return undefined;
              }
              return candidate;
            }),
          ).then((accepted) =>
            validateRows(accepted.filter((candidate) => candidate !== undefined)),
          )
        : validateRows(candidates);
      if (!isPromise(outcome)) {
        const result = settle(outcome, candidates, failures, false);
        if (metadataChanged && !candidates.length && !failures.length) host.notify();
        return result;
      }
      for (const candidate of candidates) {
        const row = pending.get(candidate.edit.rowKey) ?? new Map<string, PendingCell>();
        row.set(candidate.edit.column, Object.freeze({ ...candidate.edit }));
        pending.set(candidate.edit.rowKey, row);
      }
      setIssues(failures);
      const optimistic = host.optimistic
        ? host.apply(
            candidates.map((candidate) => candidate.edit),
            false,
            failures,
          )
        : undefined;
      if (optimistic)
        for (const [key, guard] of guards) {
          const row = host.snapshot().getRow(key);
          if (row) guard.row = row.original;
        }
      if (!optimistic?.changes.length) host.notify();
      if (!host.optimistic && failures.length) host.onIssues(failures);
      const completion = outcome.then((accepted): EditResult<TRow> => {
        const staleCandidates = candidates
          .filter((candidate) => !current(candidate) || !fresh(candidate))
          .map((candidate) => ({
            candidate,
            problem: issue(
              "stale_draft",
              "This edit was superseded or its row is no longer current.",
              {
                rowKey: candidate.edit.rowKey,
                column: candidate.edit.column,
              },
            ),
          }));
        const stale = staleCandidates.map(({ problem }) => problem);
        const issues = [...failures, ...stale];
        if (candidates.some(current)) {
          const superseded = staleCandidates
            .filter(({ candidate }) => !current(candidate))
            .map(({ problem }) => problem);
          const result = settle(
            accepted,
            candidates,
            [
              ...failures,
              ...staleCandidates
                .filter(({ candidate }) => current(candidate))
                .map(({ problem }) => problem),
            ],
            true,
          );
          if (!stale.length) return result;
          return Object.freeze({
            ...result,
            issues: Object.freeze([...result.issues, ...superseded]),
            status: result.changes.length ? "partial" : "rejected",
          });
        }
        // Cancelled batches must not publish into a replaced or disposed table.
        return Object.freeze({
          status: "rejected",
          changes: Object.freeze([]),
          rowChanges: Object.freeze([]),
          issues: Object.freeze(issues),
          pendingCells: Object.freeze([]),
        });
      });
      return Object.freeze({
        status: "pending",
        changes: optimistic?.changes ?? Object.freeze([]),
        rowChanges: Object.freeze([]),
        issues: Object.freeze([...failures]),
        pendingCells: Object.freeze(
          candidates.map((candidate) => Object.freeze({ ...candidate.edit })),
        ),
        completion,
      });
    },
  };
}
