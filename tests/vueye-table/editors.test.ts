import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import {
  VueyeGrid,
  VueyeTable,
  type CellEditorSlotProps,
  type DataTableBinding,
  type ValidationResult,
} from "vueye-table";

interface Row {
  id: number;
  name: string;
  quantity: number;
  active: boolean;
  due: Date;
  status: string;
}
const rows: readonly Row[] = [
  {
    id: 1,
    name: "Notebook",
    quantity: 2,
    active: false,
    due: new Date("2026-10-08"),
    status: "Ready",
  },
  {
    id: 2,
    name: "Folder",
    quantity: 4,
    active: true,
    due: new Date("2026-10-09"),
    status: "Waiting",
  },
];
const columns = [
  { id: "name", editable: true, editor: { kind: "text" as const, maxLength: 80 } },
  { id: "id", editable: false },
  { id: "quantity", editable: true, editor: { kind: "number" as const, min: 1, max: 20 } },
  { id: "active", editable: true, editor: { kind: "checkbox" as const } },
  {
    id: "due",
    editable: true,
    editor: {
      kind: "date" as const,
      min: new Date("2026-01-01").getTime(),
      max: new Date("2026-12-31").getTime(),
    },
  },
  {
    id: "status",
    editable: true,
    editor: { kind: "select" as const, options: ["Ready", "Waiting", "Done"] },
  },
];
function setup(
  Component: typeof VueyeTable | typeof VueyeGrid,
  extra: Record<string, unknown> = {},
  slots: Partial<
    Record<`editor.${string}`, (editor: CellEditorSlotProps) => ReturnType<typeof h>>
  > = {},
) {
  const data = shallowRef(rows);
  const wrapper = mount(Component, {
    attachTo: document.body,
    props: {
      data: data.value,
      columns,
      searchable: false,
      columnToggle: false,
      pagination: false,
      toolbar: false,
      ...(Component === VueyeTable ? { editMode: "cell" as const } : {}),
      ...extra,
      "onUpdate:data": (next: readonly unknown[]) => {
        data.value = next as readonly Row[];
      },
    },
    slots,
  });
  const table = (wrapper.vm as unknown as { table: DataTableBinding<Row> }).table;
  return {
    wrapper,
    table,
    data,
    cell: (id: string, index = 0) => wrapper.findAll(`td[data-column="${id}"]`)[index]!,
  };
}

describe("inline and typed editors", () => {
  it.each([VueyeTable, VueyeGrid])(
    "mounts one editor, commits through parse and links refused values",
    async (Component) => {
      const parse = vi.fn<(text: string) => number>((text) => Number(text.replace(" units", "")));
      const { wrapper, table, cell } = setup(Component, {
        columns: columns.map((column) =>
          column.id === "quantity" ? { ...column, parse } : column,
        ),
      });
      expect(wrapper.findAll("[data-editor]")).toHaveLength(0);
      await cell("quantity").trigger("dblclick");
      expect(wrapper.findAll("[data-editor]")).toHaveLength(1);
      expect(wrapper.get("[data-editor]").attributes("inputmode")).toBe("decimal");
      await wrapper.get("[data-editor]").setValue("30 units");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(table.getRow(1)?.original.quantity).toBe(2);
      expect(cell("quantity").attributes("aria-invalid")).toBe("true");
      const described = wrapper.get("[data-editor]").attributes("aria-describedby");
      expect(wrapper.get(`#${described}`).text()).toContain("20");
      expect(wrapper.emitted("edit-issues")?.at(-1)?.[0]).toMatchObject([
        { code: "validation_failed" },
      ]);
      await wrapper.get("[data-editor]").setValue("7 units");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(parse).toHaveBeenCalledWith("7 units", expect.anything());
      expect(table.getRow(1)?.original.quantity).toBe(7);
      expect(wrapper.findAll("[data-editor]")).toHaveLength(0);
      expect(wrapper.emitted("save")).toHaveLength(1);
      expect(rows[0]?.quantity).toBe(2);
      expect(cell("quantity").attributes("data-dirty")).toBe("");
      table.undo();
      await nextTick();
      expect(table.getRow(1)?.original.quantity).toBe(2);
      wrapper.unmount();
    },
  );
  it("starts a table cell with Enter, tabs across editable cells, and cancels", async () => {
    const { wrapper, cell, table } = setup(VueyeTable);
    await cell("name").trigger("keydown", { key: "Enter" });
    await wrapper.get("[data-editor]").setValue("Renamed");
    await wrapper.get("[data-editor]").trigger("keydown", { key: "Tab" });
    await nextTick();
    expect(document.activeElement).toBe(cell("quantity").element);
    await cell("quantity").trigger("keydown", { key: "Enter" });
    await wrapper.get("[data-editor]").setValue("9");
    await wrapper.get("[data-editor]").trigger("keydown", { key: "Escape" });
    expect(table.getRow(1)?.original.quantity).toBe(2);
    expect(wrapper.emitted("cancel")?.[0]).toEqual([1]);
    await cell("quantity").trigger("keydown", { key: "Enter" });
    await wrapper.get("[data-editor]").trigger("keydown", { key: "Tab", shiftKey: true });
    await nextTick();
    expect(document.activeElement).toBe(cell("name").element);
    await cell("id").trigger("dblclick");
    expect(wrapper.find("[data-editor]").exists()).toBe(false);
    wrapper.unmount();
  });
  it.each([VueyeTable, VueyeGrid])(
    "shows pending validation and keeps rejected input for correction",
    async (Component) => {
      let resolve!: (value: ValidationResult) => void;
      const validate = vi.fn<(value: unknown) => ValidationResult | Promise<ValidationResult>>(
        (value) =>
          value === 9
            ? new Promise<ValidationResult>((done) => {
                resolve = done;
              })
            : true,
      );
      const { wrapper, cell, table } = setup(Component, {
        columns: columns.map((column) =>
          column.id === "quantity" ? { ...column, validate } : column,
        ),
      });
      await cell("quantity").trigger("dblclick");
      await wrapper.get("[data-editor]").setValue("9");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(cell("quantity").attributes("aria-busy")).toBe("true");
      expect(wrapper.get("[data-editor]").attributes("disabled")).toBeDefined();
      await wrapper.get("[data-editor]").trigger("blur");
      expect(validate).toHaveBeenCalledOnce();
      resolve("Quantity is locked. Choose another amount.");
      await flushPromises();
      expect(wrapper.get("[data-editor]").attributes("aria-invalid")).toBe("true");
      expect(wrapper.text()).toContain("Quantity is locked");
      await wrapper.get("[data-editor]").setValue("8");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(table.getRow(1)?.original.quantity).toBe(8);
      wrapper.unmount();
    },
  );
  it.each([VueyeTable, VueyeGrid])(
    "retains optimistic refusals and displays row validation in a cell editor",
    async (Component) => {
      let resolve!: (value: ValidationResult) => void;
      const { wrapper, cell, table } = setup(Component, {
        asyncValidation: "optimistic",
        validateRow: (row: Row) =>
          row.quantity === 8 ? "This row needs a different quantity." : true,
        columns: columns.map((column) =>
          column.id === "quantity"
            ? {
                ...column,
                validate: (value: unknown) =>
                  value === 9
                    ? new Promise<ValidationResult>((done) => {
                        resolve = done;
                      })
                    : true,
              }
            : column,
        ),
      });
      await cell("quantity").trigger("dblclick");
      await wrapper.get("[data-editor]").setValue("9");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(table.getRow(1)?.original.quantity).toBe(9);
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Escape" });
      expect(wrapper.find("[data-editor]").exists()).toBe(true);
      resolve("Choose another amount.");
      await flushPromises();
      expect(table.getRow(1)?.original.quantity).toBe(2);
      await wrapper.get("[data-editor]").setValue("8");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      await flushPromises();
      expect(wrapper.get("[data-editor]").attributes("aria-invalid")).toBe("true");
      expect(cell("quantity").text()).toContain("This row needs a different quantity.");
      await wrapper.get("[data-editor]").setValue("7");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      await flushPromises();
      expect(table.getRow(1)?.original.quantity).toBe(7);
      wrapper.unmount();
    },
  );
  it("returns focus to row controls after keyboard saves and cancellation", async () => {
    const { wrapper, table, cell } = setup(VueyeTable, { editMode: "row" });
    const edit = () => wrapper.get('button[aria-label="Edit row, row 1"]');
    await edit().trigger("click");
    await cell("name").get("[data-editor]").setValue("Changed");
    await cell("active").get("[data-editor]").setValue(true);
    await cell("status").get("select").setValue("2");
    await cell("name").get("[data-editor]").trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(table.getRow(1)?.original).toMatchObject({
      name: "Changed",
      active: true,
      status: "Done",
    });
    expect(document.activeElement).toBe(edit().element);
    await edit().trigger("click");
    await cell("name").get("[data-editor]").trigger("keydown", { key: "Escape" });
    await nextTick();
    expect(document.activeElement).toBe(edit().element);
    wrapper.unmount();
  });
  it("toggles grid checkboxes with Space without mounting an editor", async () => {
    const { wrapper, cell, table } = setup(VueyeGrid);
    await cell("active").trigger("mousedown", { button: 0 });
    await wrapper.get("[role=grid]").trigger("keydown", { key: " " });
    expect(table.getRow(1)?.original.active).toBe(true);
    expect(wrapper.findAll("[data-editor]")).toHaveLength(0);
    table.undo();
    await nextTick();
    expect(table.getRow(1)?.original.active).toBe(false);
    await cell("active").trigger("dblclick");
    await wrapper.get('input[type="checkbox"][data-editor]').setValue(true);
    expect(table.getRow(1)?.original.active).toBe(true);
    wrapper.unmount();
  });
  it.each([VueyeTable, VueyeGrid])("uses native date input and core bounds", async (Component) => {
    const { wrapper, cell, table } = setup(Component);
    await cell("due").trigger("dblclick");
    expect(wrapper.get("[data-editor]").attributes("type")).toBe("date");
    expect((wrapper.get("[data-editor]").element as HTMLInputElement).value).toBe("2026-10-08");
    await wrapper.get("[data-editor]").setValue("2027-01-01");
    await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
    expect(table.getRow(1)?.original.due.toISOString()).toContain("2026-10-08");
    await wrapper.get("[data-editor]").setValue("2026-11-01");
    await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
    expect(table.getRow(1)?.original.due.toISOString()).toContain("2026-11-01");
    wrapper.unmount();
  });
  it("caps and searches large select lists without rereading metadata per key", async () => {
    const options = Array.from({ length: 2000 }, (_, index) => `Status ${index}`);
    const read = vi.fn<() => readonly string[]>(() => options);
    const spec = {
      kind: "select" as const,
      get options() {
        return read();
      },
    };
    const { wrapper, cell, table } = setup(VueyeGrid, {
      columns: [{ id: "status", editable: true, editor: spec }],
    });
    await cell("status").trigger("dblclick");
    expect(wrapper.findAll("option")).toHaveLength(50);
    const reads = read.mock.calls.length;
    await wrapper.get('input[type="search"]').setValue("Status 1999");
    expect(wrapper.findAll("option")).toHaveLength(1);
    expect(read).toHaveBeenCalledTimes(reads);
    await wrapper.get("select").setValue("1999");
    expect(table.getRow(1)?.original.status).toBe("Status 1999");
    expect(wrapper.find("[data-editor]").exists()).toBe(false);
    wrapper.unmount();
  });
  it.each([VueyeTable, VueyeGrid])(
    "routes custom editors through parse, constraints and validation",
    async (Component) => {
      const parse = vi.fn<(text: string) => number>((text) => Number(text));
      let editor!: CellEditorSlotProps;
      const { wrapper, cell, table } = setup(
        Component,
        {
          columns: columns.map((column) =>
            column.id === "quantity"
              ? {
                  ...column,
                  parse,
                  validate: (value: unknown) => (value === 13 ? "Choose another quantity." : true),
                }
              : column,
          ),
        },
        {
          "editor.quantity": (props) => {
            editor = props;
            return h(
              "button",
              { class: "custom", ...props.attrs, onClick: () => props.commit("13") },
              "Use 13",
            );
          },
        },
      );
      await cell("quantity").trigger("dblclick");
      await wrapper.get(".custom").trigger("click");
      expect(parse).toHaveBeenCalled();
      expect(table.getRow(1)?.original.quantity).toBe(2);
      expect(editor.issues[0]?.message).toBe("Choose another quantity.");
      editor.input("6");
      await editor.commit();
      await nextTick();
      expect(table.getRow(1)?.original.quantity).toBe(6);
      await cell("quantity").trigger("dblclick");
      await editor.commit(50);
      await nextTick();
      expect(table.getRow(1)?.original.quantity).toBe(6);
      editor.cancel();
      await nextTick();
      expect(wrapper.find(".custom").exists()).toBe(false);
      wrapper.unmount();
    },
  );
  it.each([VueyeTable, VueyeGrid])(
    "pastes and renders edited values and validation messages as text",
    async (Component) => {
      const attack = "<img src=x onerror=alert(1)>";
      const { wrapper, cell, table } = setup(Component);
      await cell("name").trigger("dblclick");
      await wrapper.get("[data-editor]").setValue("");
      const clipboard = {
        getData: vi.fn<(type: string) => string>((type) =>
          type === "text/plain" ? attack : "<b>rich</b>",
        ),
      };
      await wrapper.get("[data-editor]").trigger("paste", { clipboardData: clipboard });
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(table.getRow(1)?.original.name).toBe(attack);
      expect(wrapper.find("img").exists()).toBe(false);
      expect(clipboard.getData).toHaveBeenCalledExactlyOnceWith("text/plain");
      table.setColumns([{ id: "name", editable: true, validate: () => attack }]);
      await nextTick();
      await cell("name").trigger("dblclick");
      await wrapper.get("[data-editor]").setValue("Other");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect(wrapper.find("img").exists()).toBe(false);
      expect(wrapper.text()).toContain(attack);
      wrapper.unmount();
    },
  );
  it("saves row drafts as one undo batch and shows cross-field errors on the row", async () => {
    const { wrapper, table } = setup(VueyeTable, {
      editMode: "row",
      validateRow: (row: Row) =>
        row.name === "Too few" && row.quantity < 5 ? "Use at least five for this name." : true,
    });
    const row = wrapper.get('tr[data-key="1"]');
    await row.get('button[aria-label="Edit row, row 1"]').trigger("click");
    expect(row.findAll("[data-editor]")).toHaveLength(6 - 1);
    await row.get('td[data-column="name"] [data-editor]').setValue("Too few");
    await row.get('button[aria-label="Save row, row 1"]').trigger("click");
    await flushPromises();
    expect(row.text()).toContain("Use at least five");
    expect(row.get('button[aria-label="Save row, row 1"]').attributes("aria-invalid")).toBe("true");
    const rowMessage = row
      .get('button[aria-label="Save row, row 1"]')
      .attributes("aria-describedby");
    expect(wrapper.get(`#${rowMessage}`).text()).toContain("Use at least five");
    expect(table.getRow(1)?.original.name).toBe("Notebook");
    await row.get('td[data-column="quantity"] [data-editor]').setValue("6");
    await row.get('button[aria-label="Save row, row 1"]').trigger("click");
    await flushPromises();
    expect(table.getRow(1)?.original).toMatchObject({ name: "Too few", quantity: 6 });
    table.undo();
    expect(table.getRow(1)?.original).toMatchObject({ name: "Notebook", quantity: 2 });
    expect(table.canUndo).toBe(false);
    await row.get('button[aria-label="Edit row, row 1"]').trigger("click");
    await row.get('button[aria-label="Cancel, row 1"]').trigger("click");
    expect(wrapper.findAll("[data-editor]")).toHaveLength(0);
    wrapper.unmount();
  }, 30000);
  it.each([VueyeTable, VueyeGrid])(
    "adds, removes and reverts rows through core operations",
    async (Component) => {
      const { wrapper, table, cell } = setup(Component, {
        addRow: true,
        removeRows: true,
        createRow: () => ({ ...rows[0]!, id: 3, name: "New" }),
      });
      await wrapper.get("button.vt-button").trigger("click");
      expect(table.getRow(3)?.original.name).toBe("New");
      await cell("name").trigger("dblclick");
      await wrapper.get("[data-editor]").setValue("Changed");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      await wrapper.get('button[aria-label="Revert row, row 1"]').trigger("click");
      expect(table.getRow(1)?.original.name).toBe("Notebook");
      await wrapper.get('button[aria-label="Remove row, row 2"]').trigger("click");
      expect(table.getRow(2)).toBeUndefined();
      table.undo();
      expect(table.getRow(2)?.original.name).toBe("Folder");
      wrapper.unmount();
    },
  );
  it.each([VueyeTable, VueyeGrid])(
    "keeps unrelated cell slots stable on a 1k-row page",
    async (Component) => {
      const calls = new Map<string | number, number>();
      const data = Array.from({ length: 1000 }, (_, index) => ({
        ...rows[0]!,
        id: index,
        name: `Row ${index}`,
      }));
      const wrapper = mount(Component, {
        props: {
          data,
          columns: [columns[0]!],
          paginate: false,
          pagination: false,
          searchable: false,
          columnToggle: false,
          toolbar: false,
          ...(Component === VueyeTable ? { editMode: "cell" as const } : {}),
        },
        slots: {
          "cell.name": ({ row, display }: { row: { key: string | number }; display: string }) => {
            calls.set(row.key, (calls.get(row.key) ?? 0) + 1);
            return h("span", display);
          },
        },
      });
      const stable = new Map(calls);
      await wrapper.findAll('td[data-column="name"]')[0]!.trigger("dblclick");
      expect([...calls].filter(([key, count]) => key !== 0 && count !== stable.get(key))).toEqual(
        [],
      );
      await wrapper.get("[data-editor]").setValue("Updated");
      await wrapper.get("[data-editor]").trigger("keydown", { key: "Enter" });
      expect([...calls].filter(([key, count]) => key !== 0 && count !== stable.get(key))).toEqual(
        [],
      );
      expect(wrapper.findAll("[data-editor]")).toHaveLength(0);
      wrapper.unmount();
    },
    30000,
  );
  it("keeps the default data table read-only and SSR ids deterministic", async () => {
    const wrapper = mount(VueyeTable, { props: { data: rows, columns } });
    await wrapper.get('td[data-column="name"]').trigger("dblclick");
    expect(wrapper.find("[data-editor]").exists()).toBe(false);
    wrapper.unmount();
    const app = () =>
      createSSRApp({ render: () => h(VueyeTable, { data: rows, columns, editMode: "row" }) });
    expect(await renderToString(app())).toBe(await renderToString(app()));
  });
});
