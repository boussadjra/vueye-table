import {
  compareValues,
  formatValue,
  type AggregateKind,
  type GroupValue,
  type TableColumn,
} from "./column";
import { issue, type TableIssue } from "./issues";
import type { TableRow } from "./row";
import type { RowKey, SortRule } from "./state";

export interface GroupNode<TRow> {
  readonly key: string;
  readonly columnId: string;
  readonly value: GroupValue;
  readonly depth: number;
  readonly children: readonly GroupNode<TRow>[];
  readonly leaves: readonly TableRow<TRow>[];
  readonly issues: readonly TableIssue[];
  getAggregate(this: void, id: string): unknown;
  getAggregateDisplay(this: void, id: string): string;
}

export interface GroupModel<TRow> {
  readonly active: boolean;
  readonly depth: number;
  readonly roots: readonly GroupNode<TRow>[];
  readonly byKey: ReadonlyMap<string, GroupNode<TRow>>;
  readonly rows: readonly TableRow<TRow>[];
  readonly issues: readonly TableIssue[];
}

interface Buckets<TRow> {
  readonly original: TRow;
  readonly values: readonly GroupValue[];
  readonly issues: readonly TableIssue[];
}

interface DraftGroup<TRow> {
  readonly key: string;
  readonly column: TableColumn<TRow>;
  readonly value: GroupValue;
  readonly depth: number;
  readonly children: Map<GroupValue, DraftGroup<TRow>>;
  readonly leaves: TableRow<TRow>[];
}

/** Numeric aggregations ignore missing and non-finite values; count counts leaves. */
function aggregateValues(kind: AggregateKind, values: readonly unknown[]): unknown {
  if (kind === "count") return values.length;
  if (kind === "unique") return Object.freeze([...new Set(values)]);
  const numbers = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (kind === "sum") return numbers.reduce((sum, value) => sum + value, 0);
  if (!numbers.length) return undefined;
  if (kind === "mean") return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (kind === "min") return numbers.reduce((a, b) => Math.min(a, b));
  if (kind === "max") return numbers.reduce((a, b) => Math.max(a, b));
  if (kind === "median") {
    numbers.sort((a, b) => a - b);
    const middle = Math.floor(numbers.length / 2);
    return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1]! + numbers[middle]!) / 2;
  }
  throw new Error(`Unknown aggregate "${String(kind)}".`);
}

/** Retain bucketing callbacks and aggregates for unchanged leaves and group paths. */
export function createGroupingStage<TRow>(
  collator?: Intl.Collator,
): (
  rows: readonly TableRow<TRow>[],
  columns: readonly TableColumn<TRow>[],
  grouping: readonly string[],
  sorting: readonly SortRule[],
) => GroupModel<TRow> {
  let previousColumns: readonly TableColumn<TRow>[] | undefined;
  let previousGrouping: readonly string[] | undefined;
  let buckets = new Map<RowKey, Buckets<TRow>>();
  let previousNodes: ReadonlyMap<string, GroupNode<TRow>> = new Map();
  return (rows, columns, grouping, sorting) => {
    if (columns !== previousColumns || grouping !== previousGrouping) {
      buckets.clear();
      previousNodes = new Map();
      previousColumns = columns;
      previousGrouping = grouping;
    }
    const issues: TableIssue[] = [];
    const byId = new Map(columns.map((column) => [column.id, column]));
    const groupColumns = grouping.flatMap((id) => {
      const column = byId.get(id);
      if (!column) {
        issues.push(
          issue("unknown_column", `Unknown grouping column "${id}" is ignored.`, { column: id }),
        );
        return [];
      }
      if (!column.groupable) {
        issues.push(
          issue("column_not_groupable", `Column "${id}" cannot be grouped and is ignored.`, {
            column: id,
          }),
        );
        return [];
      }
      return [column];
    });
    const roots = new Map<GroupValue, DraftGroup<TRow>>();
    const nextBuckets = new Map<RowKey, Buckets<TRow>>();
    if (groupColumns.length)
      for (const row of rows) {
        let cached = buckets.get(row.key);
        if (!cached || !Object.is(cached.original, row.original)) {
          const problems: TableIssue[] = [];
          const values = groupColumns.map((column): GroupValue => {
            try {
              const raw = row.getValue(column.id);
              const value: unknown = column.groupValue
                ? column.groupValue(raw, row.original)
                : typeof raw === "number" || typeof raw === "string"
                  ? raw
                  : formatValue(raw);
              if (
                typeof value === "string" ||
                (typeof value === "number" && Number.isFinite(value))
              )
                return value;
              problems.push(
                issue(
                  "invalid_group_value",
                  "A group bucket must be text or a finite number; an empty label is used.",
                  { column: column.id, rowKey: row.key },
                ),
              );
            } catch (error) {
              problems.push(
                issue("group_value_error", error instanceof Error ? error.message : String(error), {
                  column: column.id,
                  rowKey: row.key,
                }),
              );
            }
            return "";
          });
          cached = { original: row.original, values, issues: problems };
        }
        nextBuckets.set(row.key, cached);
        issues.push(...cached.issues);
        let siblings = roots;
        const path: (string | number)[] = ["group"];
        groupColumns.forEach((column, depth) => {
          const value = cached.values[depth]!;
          path.push(column.id, value);
          let node = siblings.get(value);
          if (!node) {
            node = {
              key: JSON.stringify(path),
              column,
              value,
              depth,
              children: new Map(),
              leaves: [],
            };
            siblings.set(value, node);
          }
          node.leaves.push(row);
          siblings = node.children;
        });
      }
    buckets = nextBuckets;
    const nodes = new Map<string, GroupNode<TRow>>();
    const aggregateColumns = columns.filter((column) => column.aggregate !== undefined);
    const finish = (
      siblings: ReadonlyMap<GroupValue, DraftGroup<TRow>>,
    ): readonly GroupNode<TRow>[] => {
      const drafts = [...siblings.values()];
      const sortColumn = drafts[0]?.column;
      const rule = sortColumn && sorting.find((sort) => sort.column === sortColumn.id);
      if (rule && sortColumn)
        drafts.sort(
          (a, b) =>
            (rule.direction === "asc" ? 1 : -1) *
            (sortColumn.groupValue
              ? compareValues(a.value, b.value, collator)
              : sortColumn.compare(
                  a.leaves[0]!.getValue(sortColumn.id),
                  b.leaves[0]!.getValue(sortColumn.id),
                )),
        );
      return Object.freeze(
        drafts.map((draft): GroupNode<TRow> => {
          const children = finish(draft.children);
          const old = previousNodes.get(draft.key);
          const same =
            old &&
            old.leaves.length === draft.leaves.length &&
            old.leaves.every((row, index) =>
              Object.is(row.original, draft.leaves[index]!.original),
            );
          if (
            same &&
            old.leaves.every((row, index) => row === draft.leaves[index]) &&
            old.children.length === children.length &&
            old.children.every((child, index) => child === children[index])
          ) {
            issues.push(...old.issues);
            nodes.set(old.key, old);
            return old;
          }
          const problems: TableIssue[] = [];
          const aggregates = new Map<string, unknown>();
          const displays = new Map<string, string>();
          if (!same) {
            const originals = Object.freeze(draft.leaves.map((row) => row.original));
            for (const column of aggregateColumns) {
              try {
                const values = Object.freeze(draft.leaves.map((row) => row.getValue(column.id)));
                const aggregate = column.aggregate!;
                const value =
                  typeof aggregate === "function"
                    ? aggregate(values, originals)
                    : aggregateValues(aggregate, values);
                const display = column.formatAggregate
                  ? column.formatAggregate(value, originals)
                  : formatValue(value);
                if (typeof display !== "string")
                  throw new Error("An aggregate formatter must return text.");
                aggregates.set(column.id, value);
                displays.set(column.id, display);
              } catch (error) {
                problems.push(
                  issue("aggregate_error", error instanceof Error ? error.message : String(error), {
                    column: column.id,
                    rowKey: draft.key,
                  }),
                );
              }
            }
          }
          const result: GroupNode<TRow> = Object.freeze({
            key: draft.key,
            columnId: draft.column.id,
            value: draft.value,
            depth: draft.depth,
            children,
            leaves: Object.freeze(draft.leaves),
            issues: same ? old.issues : Object.freeze(problems),
            getAggregate: same ? old.getAggregate : (id: string): unknown => aggregates.get(id),
            getAggregateDisplay: same
              ? old.getAggregateDisplay
              : (id: string): string => displays.get(id) ?? "",
          });
          issues.push(...result.issues);
          nodes.set(result.key, result);
          return result;
        }),
      );
    };
    const groups = finish(roots);
    previousNodes = nodes;
    const ordered: TableRow<TRow>[] = [];
    const collect = (siblings: readonly GroupNode<TRow>[]): void => {
      for (const node of siblings) {
        if (node.children.length) collect(node.children);
        else for (const row of node.leaves) ordered.push(row);
      }
    };
    collect(groups);
    return Object.freeze({
      active: groupColumns.length > 0,
      depth: groupColumns.length,
      roots: groups,
      byKey: nodes,
      rows: groupColumns.length ? Object.freeze(ordered) : rows,
      issues: Object.freeze(issues),
    });
  };
}

export type GroupEntry<TRow> = GroupNode<TRow> | TableRow<TRow>;

/** Only descend into open groups; detail items are appended by the table. */
export function flattenGroups<TRow>(
  roots: readonly GroupNode<TRow>[],
  expanded: readonly string[] | true,
): readonly GroupEntry<TRow>[] {
  const keys = expanded === true ? undefined : new Set(expanded);
  const result: GroupEntry<TRow>[] = [];
  const visit = (nodes: readonly GroupNode<TRow>[]): void => {
    for (const node of nodes) {
      result.push(node);
      if (expanded !== true && !keys?.has(node.key)) continue;
      if (node.children.length) visit(node.children);
      else for (const leaf of node.leaves) result.push(leaf);
    }
  };
  visit(roots);
  return Object.freeze(result);
}
