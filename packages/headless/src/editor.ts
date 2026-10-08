import {
  formatValue,
  type EditorSpec,
  type TableColumn,
  type TableIssue,
  type TableRow,
  type EditResult,
} from "@vueye-table/core";
import {
  computed,
  defineComponent,
  h,
  onMounted,
  ref,
  useId,
  type PropType,
  type VNodeChild,
} from "vue";

/** Shared by native editors and application-owned editor slots. */
export interface CellEditorSlotProps {
  readonly row: TableRow<unknown>;
  readonly column: TableColumn<unknown>;
  readonly value: unknown;
  readonly draft: string;
  readonly spec: EditorSpec;
  readonly finish: (direction?: "up" | "down" | "left" | "right") => void;
  readonly input: (text: string) => void;
  /** Alias retained for existing headless grid slots. */
  readonly update: (text: string) => void;
  /** Strings pass through parse; typed values use core's value-edit path. */
  readonly commit: (
    value?: unknown,
  ) => EditResult<unknown> | Promise<EditResult<unknown>> | undefined;
  readonly cancel: () => void;
  readonly issues: readonly TableIssue[];
  readonly pending: boolean;
  /** Bind to a custom field to associate its validation message. */
  readonly attrs: Readonly<Record<string, string | undefined>>;
}

export function editorText(value: unknown, kind: EditorSpec["kind"]): string {
  if (value === null || value === undefined) return "";
  if (kind === "date" && value instanceof Date)
    return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : "";
  return formatValue(value);
}

export const cellEditorProps = {
  editor: { type: Object as PropType<CellEditorSlotProps>, required: true },
  spec: { type: Object as PropType<EditorSpec>, default: () => ({ kind: "text" }) },
  /** Keyboard movement is owned by the surrounding cell. */
  finish: {
    type: Function as PropType<
      ((direction?: "up" | "down" | "left" | "right") => void) | undefined
    >,
    default: undefined,
  },
  autofocus: { type: Boolean, default: true },
  blurCommit: { type: Boolean, default: true },
  tabCommit: { type: Boolean, default: true },
} as const;

/** Plain native fields. Select results are searched and capped at 50 mounted options. */
export const DataCellEditor = defineComponent({
  name: "DataCellEditor",
  props: cellEditorProps,
  setup(props) {
    const field = ref<HTMLInputElement | HTMLSelectElement>();
    const query = ref("");
    // The caller resolves the spec at edit entry, not on every keystroke.
    const options = props.spec.options ?? [];
    const matches = computed(() => {
      const search = query.value.trim().toLocaleLowerCase();
      return options
        .map((value, index) => ({ value, index }))
        .filter(({ value }) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(search),
        );
    });
    onMounted(() => {
      if (!props.autofocus) return;
      field.value?.focus();
      if (
        field.value &&
        "setSelectionRange" in field.value &&
        ["text", "number"].includes(props.spec.kind)
      )
        field.value.setSelectionRange(field.value.value.length, field.value.value.length);
    });
    const finish = (direction?: "up" | "down" | "left" | "right"): void => {
      if (props.finish) props.finish(direction);
      else void props.editor.commit();
    };
    const keydown = (event: KeyboardEvent): void => {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!props.editor.pending) props.editor.cancel();
      } else if (event.key === "Enter" || event.key === "Tab") {
        if (event.key === "Tab" && !props.tabCommit) return;
        event.preventDefault();
        event.stopPropagation();
        if (!props.editor.pending)
          finish(
            event.key === "Tab"
              ? event.shiftKey
                ? "left"
                : "right"
              : event.shiftKey
                ? "up"
                : "down",
          );
      }
    };
    const paste = (event: ClipboardEvent): void => {
      const text = event.clipboardData?.getData("text/plain");
      if (text === undefined || props.editor.pending) return;
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? target.value.length;
      props.editor.input(target.value.slice(0, start) + text + target.value.slice(end));
    };
    return () => {
      const { editor, spec } = props;
      const attrs = {
        ...editor.attrs,
        "aria-label": `Edit ${editor.column.header}`,
        "data-editor": "",
        disabled: editor.pending,
        onKeydown: keydown,
      };
      if (spec.kind === "select") {
        const shown = matches.value.slice(0, 50);
        return h(
          "div",
          {
            "data-select-editor": "",
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === "Escape") keydown(event);
            },
          },
          [
            h("input", {
              ref: field,
              type: "search",
              value: query.value,
              "aria-label": `Search ${editor.column.header} options`,
              disabled: editor.pending,
              onInput: (event: Event) => {
                query.value = (event.target as HTMLInputElement).value;
              },
              onKeydown: (event: KeyboardEvent) => {
                if (event.key === "Enter" && shown[0]) {
                  event.preventDefault();
                  void editor.commit(shown[0].value);
                } else keydown(event);
              },
            }),
            h(
              "select",
              {
                ...attrs,
                value: options.findIndex((value) => Object.is(value, editor.value)),
                size: Math.max(2, Math.min(5, shown.length)),
                onChange: (event: Event) => {
                  const index = Number((event.target as HTMLSelectElement).value);
                  if (index >= 0) void editor.commit(options[index]);
                },
              },
              shown.map(({ value, index }) =>
                h("option", { key: index, value: index }, String(value ?? "(empty)")),
              ),
            ),
            h(
              "span",
              { role: "status", "data-editor-hint": "" },
              matches.value.length === 0
                ? "No matching options. Change your search."
                : matches.value.length > 50
                  ? "Showing the first 50 matches. Refine your search."
                  : `${matches.value.length} options`,
            ),
          ],
        );
      }
      return h("input", {
        ...attrs,
        ref: field,
        type: spec.kind === "date" ? "date" : spec.kind === "checkbox" ? "checkbox" : "text",
        inputmode: spec.kind === "number" ? "decimal" : undefined,
        value: editor.draft,
        checked: spec.kind === "checkbox" ? editor.value === true : undefined,
        onInput:
          spec.kind === "checkbox"
            ? undefined
            : (event: Event) => editor.input((event.target as HTMLInputElement).value),
        onChange:
          spec.kind === "checkbox"
            ? (event: Event) => editor.commit((event.target as HTMLInputElement).checked)
            : undefined,
        onBlur: () => {
          if (props.blurCommit && !editor.pending) finish();
        },
        onPaste: spec.kind === "checkbox" ? undefined : paste,
      });
    };
  },
});

/** The cell owns the id so it remains stable while its editor mounts and unmounts. */
export function issueAttrs(
  id: string,
  issues: readonly TableIssue[],
  pending: boolean,
): Readonly<Record<string, string | undefined>> {
  return {
    "aria-invalid": issues.length ? "true" : undefined,
    "aria-describedby": issues.length ? id : undefined,
    "aria-busy": pending ? "true" : undefined,
  };
}

export function editorIssues(
  id: string,
  issues: readonly TableIssue[],
  pending = false,
): VNodeChild {
  return issues.length || pending
    ? h(
        "span",
        { id, "data-edit-issues": "", role: "status" },
        pending ? "Checking changes…" : issues.map((problem) => problem.message).join(" "),
      )
    : null;
}

export function useEditorId(): string {
  return `vt-edit-${useId()}`;
}
