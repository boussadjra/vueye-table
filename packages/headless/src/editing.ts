import type { EditResult, GridDirection, RowKey, TableIssue, TableRow } from "@vueye-table/core";
import {
  injectDataTable,
  useDataGrid,
  type AnyDataTableBinding,
  type DataGridBinding,
  type RowDraft,
  useTableLocale,
} from "@vueye-table/vue";
import {
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onScopeDispose,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from "vue";

import {
  DataCellEditor,
  editorIssues,
  editorText,
  issueAttrs,
  useEditorId,
  type CellEditorSlotProps,
} from "./editor";
import { rowProp, columnProp } from "./shared";
import { DataTableCell } from "./table";

interface EditingContext {
  readonly grid: DataGridBinding<unknown>;
  readonly mode: "cell" | "row";
  readonly draft: RowDraft<unknown> | undefined;
  start(row: TableRow<unknown>): void;
  save(): Promise<EditResult<unknown> | undefined>;
  cancel(key: RowKey): void;
}
const editingKey: InjectionKey<EditingContext> = Symbol("vueye-table-editing");
export function injectEditingGrid(): DataGridBinding<unknown> | undefined {
  return inject(editingKey, undefined)?.grid;
}

/** Renderless provider for editable data-table cells and row forms. */
export const DataTableEditRoot = defineComponent({
  name: "DataTableEditRoot",
  slots: Object as SlotsType<{ default?: (props: { editing: EditingContext }) => VNodeChild }>,
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    mode: { type: String as PropType<"cell" | "row">, default: "cell" },
  },
  emits: {
    save: (_result: EditResult<unknown>) => true,
    cancel: (_key: RowKey) => true,
  },
  setup(props, { slots, emit, expose }) {
    const grid = useDataGrid(props.table);
    const draft = shallowRef<RowDraft<unknown>>();
    const context: EditingContext = {
      grid,
      get mode() {
        return props.mode;
      },
      get draft() {
        return draft.value;
      },
      start(row) {
        if (draft.value?.pending) return;
        if (draft.value) context.cancel(draft.value.rowKey);
        grid.cancelEdit();
        const column = props.table.columns.findIndex((candidate) =>
          candidate.isEditable(row.original),
        );
        grid.focusCell({
          row: props.table.rows.findIndex((candidate) => candidate.key === row.key),
          column,
        });
        grid.startEdit();
        draft.value = props.table.editRow(row.key);
      },
      async save() {
        const active = draft.value;
        if (!active || active.pending) return undefined;
        const result = await active.save();
        if (draft.value === active && active.status !== "editing" && !active.pending) {
          draft.value = undefined;
          grid.cancelEdit();
        }
        if (result.status !== "rejected") emit("save", result);
        return result;
      },
      cancel(key) {
        if (draft.value?.rowKey === key && !draft.value.pending) {
          draft.value.cancel();
          draft.value = undefined;
          grid.cancelEdit();
          emit("cancel", key);
        }
      },
    };
    provide(editingKey, context);
    expose({ editing: context });
    watch(
      () => props.table.rows,
      (rows) => {
        if (draft.value && !rows.some((row) => row.key === draft.value?.rowKey))
          context.cancel(draft.value.rowKey);
      },
    );
    onScopeDispose(() => draft.value?.cancel());
    return () => slots.default?.({ editing: context });
  },
});

/** A cell with on-demand editing; row mode shares one draft and one save operation. */
export const DataTableEditCell = defineComponent({
  name: "DataTableEditCell",
  props: {
    row: rowProp,
    column: columnProp,
    rowIndex: { type: Number as PropType<number | undefined>, default: undefined },
    tree: { type: Boolean, default: true },
  },
  slots: Object as SlotsType<{
    default?: (props: { row: TableRow<unknown>; value: unknown; display: string }) => VNodeChild;
    editor?: (props: CellEditorSlotProps) => VNodeChild;
  }>,
  emits: { save: (_result: EditResult<unknown>) => true, cancel: (_key: RowKey) => true },
  setup(props, { slots, emit }) {
    const table = injectDataTable("<DataTableEditCell>");
    const context = inject(editingKey);
    if (!context) throw new Error("<DataTableEditCell> requires <DataTableEditRoot>.");
    const { grid } = context;
    const id = useEditorId();
    const element = shallowRef<HTMLElement>();
    const position = () => ({
      row: props.rowIndex ?? table.rows.indexOf(props.row),
      column: table.columns.indexOf(props.column),
    });
    const active = computed(() =>
      context.mode === "row" ? context.draft?.rowKey === props.row.key : grid.isEditing(position()),
    );
    const pending = computed(() =>
      context.mode === "row"
        ? !!context.draft?.pending
        : active.value && grid.lastResult?.status === "pending",
    );
    const localText = shallowRef("");
    watch(active, (value) => {
      if (value)
        localText.value = editorText(
          props.row.getValue(props.column.id),
          grid.editorFor(position())?.kind ?? "text",
        );
    });
    const focus = (direction?: GridDirection): void => {
      void nextTick(() => {
        if (!direction) {
          element.value?.focus();
          return;
        }
        const all = [
          ...(element.value
            ?.closest("table")
            ?.querySelectorAll<HTMLElement>("[data-edit-cell][data-editable]") ?? []),
        ];
        const at = all.indexOf(element.value!);
        all[at + (direction === "left" ? -1 : 1)]?.focus();
      });
    };
    const submit = (
      value?: unknown,
      direction?: GridDirection,
    ): EditResult<unknown> | Promise<EditResult<unknown>> | undefined => {
      if (context.mode === "row") {
        if (value !== undefined) {
          if (typeof value === "string") {
            localText.value = value;
            context.draft?.setValue(props.column.id, value);
            context.draft?.setInput(props.column.id, value);
          } else context.draft?.setValue(props.column.id, value);
        }
        return undefined;
      }
      const result = grid.submitEdit(
        value === undefined ? undefined : typeof value === "string" ? { input: value } : { value },
      );
      const finish = (final: EditResult<unknown>): void => {
        if (final.status !== "rejected") {
          emit("save", final);
          focus(direction);
        }
      };
      if (result?.completion) void result.completion.then(finish);
      else if (result) finish(result);
      return result;
    };
    return () => {
      const { row, column } = props;
      const editable = column.isEditable(row.original);
      const editing = editable && active.value;
      const draft = context.draft?.rowKey === row.key ? context.draft : undefined;
      const issues =
        draft?.issues.filter((problem) => problem.column === column.id) ??
        (row.cellIssues?.get(column.id)
          ? [row.cellIssues.get(column.id)!]
          : active.value
            ? (grid.lastResult?.issues.filter(
                (problem) =>
                  problem.rowKey === row.key && (problem.column === column.id || !problem.column),
              ) ?? [])
            : []);
      const spec = editing ? (grid.editorFor(position()) ?? { kind: "text" as const }) : undefined;
      const input = (text: string): void => {
        localText.value = text;
        if (context.mode === "row") {
          draft?.setValue(column.id, text);
          draft?.setInput(column.id, text);
        } else grid.updateDraft(text);
      };
      const cancel = (): void => {
        if (pending.value) return;
        if (context.mode === "row") context.cancel(row.key);
        else {
          grid.cancelEdit();
          emit("cancel", row.key);
        }
        focus();
      };
      const editor: CellEditorSlotProps = {
        row,
        column,
        value:
          context.mode === "row"
            ? Reflect.get(draft?.values ?? {}, column.id)
            : row.getValue(column.id),
        draft: context.mode === "row" ? localText.value : (grid.editor?.draft ?? ""),
        spec: spec ?? { kind: "text" },
        finish: (direction) => {
          if (context.mode === "row") void context.save();
          else
            void submit(
              undefined,
              direction === "left" || direction === "right" ? direction : undefined,
            );
        },
        input,
        update: input,
        commit: submit,
        cancel,
        issues,
        pending: pending.value,
        attrs: issueAttrs(id, issues, pending.value),
      };
      return h(
        DataTableCell,
        {
          ref: (target: unknown) => {
            element.value =
              target && typeof target === "object" && "$el" in target
                ? (target.$el as HTMLElement)
                : undefined;
          },
          row,
          column,
          tree: props.tree,
          "data-edit-cell": "",
          "data-editable": editable ? "" : undefined,
          "data-editing": editing ? "" : undefined,
          "data-dirty": row.isDirty ? "" : undefined,
          ...issueAttrs(id, issues, pending.value),
          tabindex: editable ? 0 : undefined,
          onFocus: (event: FocusEvent) => {
            if (event.target === element.value && !grid.editor) grid.focusCell(position());
          },
          onDblclick: () => {
            if (editable && context.mode === "cell") {
              grid.focusCell(position());
              grid.startEdit(
                editorText(row.getValue(column.id), grid.editorFor(position())?.kind ?? "text"),
              );
            }
          },
          onKeydown: (event: KeyboardEvent) => {
            if (event.target === element.value && event.key === "Enter" && editable) {
              event.preventDefault();
              event.stopPropagation();
              if (context.mode === "row") context.start(row);
              else {
                grid.focusCell(position());
                grid.startEdit(
                  editorText(row.getValue(column.id), grid.editorFor(position())?.kind ?? "text"),
                );
              }
            }
          },
        },
        {
          default: ({ value, display }: { value: unknown; display: string }) => [
            editing
              ? (slots.editor?.(editor) ??
                h(DataCellEditor, {
                  editor,
                  spec: spec ?? { kind: "text" },
                  autofocus:
                    context.mode === "cell" ||
                    table.columns.find((candidate) => candidate.isEditable(row.original))?.id ===
                      column.id,
                  blurCommit: context.mode === "cell",
                  tabCommit: context.mode === "cell",
                  finish: (direction?: GridDirection) => {
                    if (context.mode === "row") void context.save();
                    else
                      void submit(
                        undefined,
                        direction === "left" || direction === "right" ? direction : undefined,
                      );
                  },
                }))
              : (slots.default?.({ row, value, display }) ?? display),
            editorIssues(id, issues, pending.value),
          ],
        },
      );
    };
  },
});

/** One active row form. Controls share the provider's draft and core save/undo path. */
export const DataTableRowActions = defineComponent({
  name: "DataTableRowActions",
  props: {
    row: rowProp,
    editable: { type: Boolean, default: true },
    removable: { type: Boolean, default: false },
  },
  setup(props) {
    const table = injectDataTable("<DataTableRowActions>");
    const locale = useTableLocale();
    const context = inject(editingKey, undefined);
    const id = useEditorId();
    const element = shallowRef<HTMLElement>();
    watch(
      () => context?.draft?.rowKey === props.row.key,
      (active, previous) => {
        const target = element.value;
        if (
          previous &&
          !active &&
          !context?.draft &&
          target?.closest("tr")?.contains(target.ownerDocument.activeElement)
        )
          void nextTick(() =>
            target.querySelector<HTMLButtonElement>("button[data-edit-row]")?.focus(),
          );
      },
    );
    return () => {
      const { messages } = locale();
      const rowName = String(props.row.key);
      const draft = context?.draft?.rowKey === props.row.key ? context.draft : undefined;
      const issues: readonly TableIssue[] = [
        ...new Map(draft?.issues.map((problem) => [problem.message, problem])).values(),
      ];
      const button = (
        label: string,
        action: () => unknown,
        disabled = false,
        role?: "edit" | "save",
      ) =>
        h(
          "button",
          {
            type: "button",
            disabled,
            "aria-label": messages.actionOnRow(label, rowName),
            "data-edit-row": role === "edit" ? "" : undefined,
            ...(role === "save" ? issueAttrs(id, issues, !!draft?.pending) : {}),
            onClick: action,
          },
          label,
        );
      return h(
        "div",
        {
          ref: element,
          "data-row-actions": "",
          role: "group",
          "aria-label": messages.rowActionsFor(rowName),
          "aria-busy": draft?.pending ? "true" : undefined,
        },
        [
          ...(context?.mode === "row" && props.editable
            ? draft
              ? [
                  button(messages.saveRow, () => context.save(), draft.pending, "save"),
                  button(messages.cancel, () => context.cancel(props.row.key), draft.pending),
                ]
              : [button(messages.editRow, () => context.start(props.row), false, "edit")]
            : []),
          h(
            "details",
            {
              onToggle: (event: Event) => {
                const menu = event.currentTarget as HTMLDetailsElement;
                if (menu.open)
                  void nextTick(() =>
                    menu.scrollIntoView?.({ block: "nearest", inline: "nearest" }),
                  );
              },
            },
            [
              h("summary", { "aria-label": messages.actionsForRow(rowName) }, messages.actions),
              h("div", { "data-row-menu": "" }, [
                button(
                  messages.revertRow,
                  () => table.revert([props.row.key]),
                  !props.row.isDirty || !!draft,
                ),
                props.removable
                  ? button(messages.removeRow, () => table.removeRows([props.row.key]), !!draft)
                  : null,
              ]),
            ],
          ),
          editorIssues(id, issues, !!draft?.pending),
        ],
      );
    };
  },
});
