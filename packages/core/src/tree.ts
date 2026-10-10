import type { TableColumn } from "./column";
import { issue, type TableIssue } from "./issues";
import { filterRows, sortRows } from "./pipeline";
import { createRow, type TableRow } from "./row";
import type { ExpandedState, RowKey, TableState } from "./state";
import type { TextNormalizer } from "./text";

/** A runtime supplies its own cancellation primitive; core needs no platform globals. */
export interface TreeLoadSignal {
  readonly aborted: boolean;
}

export interface TreeLoadController<TSignal extends TreeLoadSignal = TreeLoadSignal> {
  readonly signal: TSignal;
  abort(): void;
}

export type TreeFilter = "ancestors" | "descendants" | "strict";
export type TreePagination = "root" | "row";
export type ChildStatus = "idle" | "loading" | "loaded" | "error";

export interface TreeOptions<TRow, TSignal extends TreeLoadSignal = TreeLoadSignal> {
  readonly getChildren?: ((row: TRow) => readonly TRow[] | undefined) | undefined;
  /** Immutable counterpart of getChildren, required when editing nested descendants. */
  readonly setChildren?: ((row: TRow, children: readonly TRow[]) => TRow) | undefined;
  readonly getParentKey?: ((row: TRow) => RowKey | null | undefined) | undefined;
  readonly hasChildren?: ((row: TRow) => boolean) | undefined;
  readonly loadChildren?:
    | ((row: TableRow<TRow>, signal: TSignal) => Promise<readonly TRow[]>)
    | undefined;
  /** Required with loadChildren. Supply a controller from the caller's runtime. */
  readonly createChildLoadController?: (() => TreeLoadController<TSignal>) | undefined;
  readonly treeFilter?: TreeFilter | undefined;
  readonly paginateBy?: TreePagination | undefined;
  /** Maximum edges from a root. Deeper rows recover as roots. Defaults to 1,000. */
  readonly maxDepth?: number | undefined;
}

export interface TreeNode<TRow> {
  row: TableRow<TRow>;
  parent: TreeNode<TRow> | undefined;
  children: TreeNode<TRow>[];
  depth: number;
  /** Position in the parent's children, or the source roots. */
  sourceIndex: number;
  lazy: boolean;
  writable: boolean;
  unloaded: boolean;
}

export interface TreeModel<TRow> {
  readonly rows: readonly TableRow<TRow>[];
  readonly nodes: readonly TreeNode<TRow>[];
  readonly roots: readonly TreeNode<TRow>[];
  readonly byKey: ReadonlyMap<RowKey, TreeNode<TRow>>;
  readonly issues: readonly TableIssue[];
}

export function buildTree<TRow, TSignal extends TreeLoadSignal>(
  data: readonly TRow[],
  columns: ReadonlyMap<string, TableColumn<TRow>>,
  readKey: (row: TRow, index: number) => RowKey,
  options: TreeOptions<TRow, TSignal>,
  lazy: ReadonlyMap<RowKey, readonly TRow[]>,
): TreeModel<TRow> {
  const nodes: TreeNode<TRow>[] = [];
  const byKey = new Map<RowKey, TreeNode<TRow>>();
  const issues: TableIssue[] = [];
  const nested = options.getChildren !== undefined;
  let maxDepth = options.maxDepth ?? 1_000;
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1) {
    issues.push(
      issue("invalid_tree_option", "maxDepth must be a positive safe integer; 1,000 is used."),
    );
    maxDepth = 1_000;
  }
  if (nested && options.getParentKey) {
    issues.push(
      issue("invalid_tree_option", "Both tree inputs were supplied; getChildren takes precedence."),
    );
  }
  const seen = new Set<TRow>();
  const stack = data
    .map((original, sourceIndex) => ({
      original,
      sourceIndex,
      parent: undefined as TreeNode<TRow> | undefined,
      lazy: false,
    }))
    .reverse();
  while (stack.length) {
    const entry = stack.pop()!;
    const index = nodes.length;
    let key = readKey(entry.original, index);
    let parent = entry.parent;
    const reference =
      entry.original !== null &&
      (typeof entry.original === "object" || typeof entry.original === "function");
    const repeated = nested && reference && seen.has(entry.original);
    if (repeated) {
      issues.push(
        issue(
          "tree_cycle",
          "A repeated nested value recovers as a root without traversing it again.",
          { rowKey: key },
        ),
      );
      parent = undefined;
    }
    if (reference) seen.add(entry.original);
    if (byKey.has(key)) {
      issues.push(
        issue(
          entry.lazy ? "tree_duplicate_key" : "duplicate_row_key",
          entry.lazy
            ? "A loaded child repeats an existing key and is rejected."
            : "A repeated row key is replaced with a unique key.",
          { rowKey: key },
        ),
      );
      if (entry.lazy) continue;
      const prefix = `${String(key)}#${index}`;
      key = prefix;
      let suffix = 0;
      while (byKey.has(key)) key = `${prefix}#${++suffix}`;
    }
    if (parent && parent.depth + 1 > maxDepth) {
      issues.push(
        issue(
          "tree_depth_exceeded",
          "The maximum tree depth was exceeded; this row recovers as a root.",
          { rowKey: key },
        ),
      );
      parent = undefined;
    }
    const children = repeated
      ? undefined
      : (lazy.get(key) ?? options.getChildren?.(entry.original));
    const node: TreeNode<TRow> = {
      row: createRow(entry.original, key, index, columns),
      parent,
      children: [],
      depth: parent ? parent.depth + 1 : 0,
      sourceIndex: entry.sourceIndex,
      lazy: entry.lazy,
      writable: parent?.writable ?? entry.parent === undefined,
      unloaded: children === undefined && (options.hasChildren?.(entry.original) ?? false),
    };
    nodes.push(node);
    byKey.set(key, node);
    if (parent) parent.children.push(node);
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({
          original: children[i]!,
          sourceIndex: i,
          parent: node,
          lazy: entry.lazy || lazy.has(key),
        });
      }
    }
  }
  if (!nested && options.getParentKey) {
    // One lookup per source row; lazy attachments already have an explicit parent.
    for (const node of nodes) {
      if (node.lazy) continue;
      const key = options.getParentKey(node.row.original);
      if (key === undefined || key === null) continue;
      const parent = byKey.get(key);
      if (!parent)
        issues.push(
          issue("tree_orphan", "The parent is missing; this row recovers as a root.", {
            rowKey: node.row.key,
          }),
        );
      else node.parent = parent;
    }
    const done = new Set<TreeNode<TRow>>();
    for (const node of nodes) {
      const path: TreeNode<TRow>[] = [];
      const visiting = new Set<TreeNode<TRow>>();
      let cursor: TreeNode<TRow> | undefined = node;
      while (cursor && !done.has(cursor)) {
        if (visiting.has(cursor)) {
          issues.push(
            issue("tree_cycle", "A cyclic parent reference is detached to a root.", {
              rowKey: cursor.row.key,
            }),
          );
          cursor.parent = undefined;
          break;
        }
        visiting.add(cursor);
        path.push(cursor);
        cursor = cursor.parent;
      }
      for (let i = path.length - 1; i >= 0; i--) {
        const current = path[i]!;
        done.add(current);
      }
    }
    for (const node of nodes) node.children = [];
    for (const node of nodes) if (node.parent) node.parent.children.push(node);
    const pending = nodes.filter((node) => !node.parent);
    while (pending.length) {
      const node = pending.pop()!;
      node.depth = node.parent ? node.parent.depth + 1 : 0;
      if (node.depth > maxDepth) {
        node.parent = undefined;
        node.depth = 0;
        issues.push(
          issue(
            "tree_depth_exceeded",
            "The maximum tree depth was exceeded; this row recovers as a root.",
            { rowKey: node.row.key },
          ),
        );
      }
      for (const child of node.children) pending.push(child);
    }
    for (const node of nodes)
      node.children = node.children.filter((child) => child.parent === node);
  }
  return {
    nodes,
    rows: nodes.map((node) => node.row),
    roots: nodes.filter((node) => !node.parent),
    byKey,
    issues,
  };
}

export interface ProcessedTree<TRow> {
  readonly model: TreeModel<TRow>;
  readonly roots: readonly TreeNode<TRow>[];
  readonly children: ReadonlyMap<TreeNode<TRow>, readonly TreeNode<TRow>[]>;
  readonly autoExpanded: ReadonlySet<RowKey>;
}

export function processTree<TRow>(
  model: TreeModel<TRow>,
  columns: readonly TableColumn<TRow>[],
  state: TableState,
  mode: TreeFilter,
  manual: boolean,
  normalize?: TextNormalizer,
): ProcessedTree<TRow> {
  const raw = model.nodes.map((node) => node.row);
  const matched = manual ? raw : filterRows(raw, columns, state.search, state.filters, normalize);
  const active = matched !== raw;
  const included = new Set(matched.map((row) => row.key));
  const autoExpanded = new Set<RowKey>();
  if (active && mode !== "strict") {
    if (mode === "descendants") {
      const stack = matched.map((row) => model.byKey.get(row.key)!);
      const visited = new Set<RowKey>();
      while (stack.length) {
        const node = stack.pop()!;
        if (visited.has(node.row.key)) continue;
        visited.add(node.row.key);
        included.add(node.row.key);
        if (node.children.length) autoExpanded.add(node.row.key);
        for (const child of node.children) stack.push(child);
      }
    }
    for (const row of matched) {
      let parent = model.byKey.get(row.key)!.parent;
      while (parent && !autoExpanded.has(parent.row.key)) {
        included.add(parent.row.key);
        autoExpanded.add(parent.row.key);
        parent = parent.parent;
      }
    }
  }
  if (active && mode === "strict") {
    const leaves = model.nodes.filter(
      (node) => included.has(node.row.key) && node.children.length === 0 && !node.unloaded,
    );
    return { model, roots: ordered(leaves), children: new Map(), autoExpanded };
  }
  const children = new Map<TreeNode<TRow>, readonly TreeNode<TRow>[]>();
  for (const node of model.nodes)
    if (node.children.length)
      children.set(node, ordered(node.children.filter((child) => included.has(child.row.key))));
  return {
    model,
    roots: ordered(model.roots.filter((node) => included.has(node.row.key))),
    children,
    autoExpanded,
  };

  function ordered(nodes: readonly TreeNode<TRow>[]): readonly TreeNode<TRow>[] {
    if (manual || !state.sorting.length || nodes.length < 2) return nodes;
    return sortRows(
      nodes.map((node) => node.row),
      columns,
      state.sorting,
    ).map((row) => model.byKey.get(row.key)!);
  }
}

/** Expansion changes reuse filtering and sibling order, splicing only a changed subtree. */
export function createTreeFlattener<TRow>(): (
  tree: ProcessedTree<TRow>,
  expanded: ExpandedState,
  ancestors: ReadonlySet<RowKey>,
) => readonly TreeNode<TRow>[] {
  let previous: ProcessedTree<TRow> | undefined;
  let previousExpanded: ExpandedState = [];
  let visible: readonly TreeNode<TRow>[] = [];
  let previousAncestors: ReadonlySet<RowKey> | undefined;
  return (tree, expanded, ancestors) => {
    if (tree === previous && expanded === previousExpanded && ancestors === previousAncestors)
      return visible;
    const keys = expanded === true ? undefined : new Set(expanded);
    const open = (node: TreeNode<TRow>): boolean =>
      expanded === true ||
      (keys?.has(node.row.key) ?? false) ||
      ancestors.has(node.row.key) ||
      tree.autoExpanded.has(node.row.key);
    const walk = (roots: readonly TreeNode<TRow>[]): TreeNode<TRow>[] => {
      const output: TreeNode<TRow>[] = [];
      const stack = [...roots].reverse();
      while (stack.length) {
        const node = stack.pop()!;
        output.push(node);
        if (open(node)) {
          const children = tree.children.get(node) ?? [];
          for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
        }
      }
      return output;
    };
    let changed: RowKey[] | undefined;
    if (
      previous === tree &&
      ancestors === previousAncestors &&
      expanded !== true &&
      previousExpanded !== true
    ) {
      const before = new Set(previousExpanded);
      const after = new Set(expanded);
      changed = [
        ...previousExpanded.filter((key) => !after.has(key)),
        ...expanded.filter((key) => !before.has(key)),
      ];
    }
    if (changed?.length === 1 && !tree.autoExpanded.has(changed[0]!)) {
      const index = visible.findIndex((node) => node.row.key === changed[0]);
      if (index >= 0) {
        const node = visible[index]!;
        let end = index + 1;
        while (end < visible.length && visible[end]!.depth > node.depth) end++;
        const inserted = walk(open(node) ? (tree.children.get(node) ?? []) : []);
        visible = visible.slice(0, index + 1).concat(inserted, visible.slice(end));
      }
    } else visible = walk(tree.roots);
    previous = tree;
    previousExpanded = expanded;
    previousAncestors = ancestors;
    return visible;
  };
}
