import { mount } from "@vue/test-utils";
import type { TableColumn, TableRow } from "@vueye-table/core";
import {
  DataTableBody,
  DataTableCaption,
  DataTableCell,
  DataTableColumnVisibility,
  DataTableEmpty,
  DataTableHeader,
  DataTableHeaderCell,
  DataTablePageSize,
  DataTablePagination,
  DataTableRoot,
  DataTableRow,
  DataTableSearch,
  DataTableSelectAll,
  DataTableSelectRow,
  DataTableSortButton,
  DataTableStatus,
} from "@vueye-table/headless";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";

import { people, type Person } from "../fixtures";
import { mountWithTable } from "../helpers";

const options = {
  data: people,
  columns: [
    { id: "name.first" as const, header: "First" },
    { id: "age" as const, align: "end" as const, width: 80, minWidth: 60 },
    { id: "city" as const, sortable: false },
  ],
  initialState: { pagination: { page: 1, pageSize: 3 } },
};

describe("DataTableRoot", () => {
  it("renders a complete, accessible table without slots", async () => {
    const { wrapper } = mountWithTable<Person>(options, (table) => h(DataTableRoot, { table }));
    const root = wrapper.get("table");
    expect(root.attributes("aria-rowcount")).toBe("8");
    expect(root.attributes("aria-colcount")).toBe("3");
    const headers = wrapper.findAll("th");
    expect(headers.map((th) => th.attributes("aria-sort"))).toEqual(["none", "none", undefined]);
    expect(headers[1]?.attributes("style")).toContain("width: 80px");
    expect(headers[1]?.attributes("data-align")).toBe("end");
    expect(wrapper.findAll("tbody tr")).toHaveLength(3);
    expect(wrapper.findAll("tbody tr")[1]?.attributes("aria-rowindex")).toBe("3");
    expect(wrapper.get("tbody td").text()).toBe("Ada");

    await wrapper.findAll("th button")[1]?.trigger("click");
    expect(headers[1]?.attributes("aria-sort")).toBe("ascending");
    expect(wrapper.findAll("th button")[1]?.attributes("aria-label")).toBe("Age, sort descending");
    await wrapper.findAll("th button")[1]?.trigger("click");
    expect(headers[1]?.attributes("aria-sort")).toBe("descending");
    expect(wrapper.get("tbody td").text()).toBe("Margaret");
    await wrapper.findAll("th button")[0]?.trigger("click", { shiftKey: true });
    expect(headers[0]?.attributes("data-sort")).toBe("asc");
    expect(headers[1]?.attributes("data-sort")).toBe("desc");
  });

  it("passes state to slots at every level", async () => {
    const { wrapper } = mountWithTable<Person>(options, (table) =>
      h(DataTableRoot, { table }, () => [
        h(DataTableCaption, () => "People"),
        h(DataTableHeader, null, {
          default: ({ columns }: { columns: readonly TableColumn<Person>[] }) =>
            h(
              "tr",
              columns.map((column) =>
                h(
                  DataTableHeaderCell,
                  { key: column.id, column },
                  {
                    default: ({ sort, toggleSort }: { sort: unknown; toggleSort: () => void }) =>
                      h("span", { onClick: () => toggleSort() }, sort ? "sorted" : "plain"),
                  },
                ),
              ),
            ),
        }),
        h(DataTableBody, null, {
          default: ({ rows }: { rows: readonly TableRow<Person>[] }) =>
            rows.map((row) =>
              h(
                DataTableRow,
                { key: String(row.key), row },
                {
                  default: ({
                    selected,
                    columns,
                  }: {
                    selected: boolean;
                    columns: readonly TableColumn<Person>[];
                  }) =>
                    columns.map((column) =>
                      h(
                        DataTableCell,
                        { key: column.id, row, column },
                        {
                          default: ({ value, display }: { value: unknown; display: string }) =>
                            `${display}:${typeof value}:${String(selected)}`,
                        },
                      ),
                    ),
                },
              ),
            ),
        }),
      ]),
    );
    expect(wrapper.get("caption").text()).toBe("People");
    expect(wrapper.get("td").text()).toBe("Ada:string:false");
    await wrapper.get("th span").trigger("click");
    expect(wrapper.get("th span").text()).toBe("sorted");
  });

  it("renders the empty slot in a full-width row", () => {
    const { wrapper } = mountWithTable<Person>({ ...options, data: [] }, (table) =>
      h(DataTableRoot, { table }, () => [
        h(DataTableBody, null, { empty: () => "Nothing here" }),
        h(DataTableEmpty, () => "No rows at all"),
      ]),
    );
    expect(wrapper.get("td").attributes("colspan")).toBe("3");
    expect(wrapper.get("td").text()).toBe("Nothing here");
    expect(wrapper.get("[role=status]").text()).toBe("No rows at all");
  });

  it("renders a custom sort button indicator", async () => {
    const { wrapper } = mountWithTable<Person>(options, (table) =>
      h(DataTableRoot, { table }, () =>
        h(
          DataTableSortButton,
          { column: table.columns[0] as TableColumn<Person> },
          {
            indicator: ({ sort }: { sort?: { direction: string } }) => sort?.direction ?? "none",
          },
        ),
      ),
    );
    expect(wrapper.text()).toBe("Firstnone");
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toBe("Firstasc");
  });
});

describe("controls", () => {
  it("selects rows and all rows with an indeterminate state", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () => [
        h(DataTableSelectAll),
        ...t.rows.map((row) => h(DataTableSelectRow, { key: row.key, row })),
      ]),
    );
    const boxes = () => wrapper.findAll("input");
    await boxes()[1]?.trigger("change");
    expect(table().state.selection).toEqual([1]);
    expect(boxes()[0]?.attributes("data-state")).toBe("indeterminate");
    expect(boxes()[0]?.element.indeterminate).toBe(true);
    await boxes()[0]?.trigger("change");
    expect(table().selectedCount).toBe(7);
    expect(boxes()[0]?.attributes("data-state")).toBe("checked");
    expect(boxes()[1]?.attributes("aria-label")).toBe("Select row 1");
    expect(boxes()[2]?.attributes("aria-label")).toBe("Select row 2");
  });

  it("offers custom selection slots", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () => [
        h(DataTableSelectAll, null, {
          default: ({ state, toggle }: { state: string; toggle: () => void }) =>
            h("button", { class: "all", onClick: toggle }, state),
        }),
        h(
          DataTableSelectRow,
          { row: t.rows[0] as TableRow<Person> },
          {
            default: ({ selected, toggle }: { selected: boolean; toggle: () => void }) =>
              h("button", { class: "one", onClick: toggle }, String(selected)),
          },
        ),
      ]),
    );
    await wrapper.get(".one").trigger("click");
    expect(wrapper.get(".one").text()).toBe("true");
    await wrapper.get(".all").trigger("click");
    expect(table().allSelection).toBe("all");
  });

  it("searches immediately or after a debounce", async () => {
    vi.useFakeTimers();
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () => [
        h(DataTableSearch, { class: "now", placeholder: "Find" }),
        h(DataTableSearch, { class: "later", debounce: 200 }),
      ]),
    );
    await wrapper.get(".now").setValue("bos");
    expect(table().rowCount).toBe(2);
    expect(wrapper.get(".now").attributes("placeholder")).toBe("Find");
    await wrapper.get(".later").setValue("ada");
    expect(table().state.search).toBe("bos");
    vi.advanceTimersByTime(200);
    expect(table().state.search).toBe("ada");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("paginates with buttons, gaps, and a custom slot", async () => {
    const { wrapper, table } = mountWithTable<Person>(
      { ...options, initialState: { pagination: { page: 1, pageSize: 1 } } },
      (t) => h(DataTableRoot, { table: t }, () => h(DataTablePagination)),
    );
    const nav = wrapper.get("nav");
    expect(nav.attributes("aria-label")).toBe("Pagination");
    expect(nav.find("[data-gap]").exists()).toBe(true);
    expect(nav.get("[aria-current=page]").text()).toBe("1");
    await nav.get("[aria-label='Next page']").trigger("click");
    expect(table().page).toBe(2);
    await nav.get("[aria-label='Page 7']").trigger("click");
    expect(table().page).toBe(7);
    expect(nav.get("[aria-label='Next page']").attributes("disabled")).toBeDefined();
    await nav.get("[aria-label='Previous page']").trigger("click");
    expect(table().page).toBe(6);

    const custom = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () =>
        h(DataTablePagination, null, {
          default: ({
            page,
            pageCount,
            next,
          }: {
            page: number;
            pageCount: number;
            next: () => void;
          }) => h("button", { onClick: next }, `${page}/${pageCount}`),
        }),
      ),
    );
    await custom.wrapper.get("button").trigger("click");
    expect(custom.wrapper.get("button").text()).toBe("2/3");
  });

  it("changes the page size and lists an unlisted current size", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () => h(DataTablePageSize, { options: [5, 10] })),
    );
    expect(wrapper.findAll("option").map((option) => option.text())).toEqual(["3", "5", "10"]);
    await wrapper.get("select").setValue("5");
    expect(table().pageSize).toBe(5);
  });

  it("shows and hides columns but never the last one", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () => h(DataTableColumnVisibility)),
    );
    expect(wrapper.get("legend").text()).toBe("Columns");
    const boxes = () => wrapper.findAll("input");
    await boxes()[0]?.trigger("change");
    await boxes()[1]?.trigger("change");
    expect(table().columns.map((column) => column.id)).toEqual(["city"]);
    expect(boxes()[2]?.attributes("disabled")).toBeDefined();
  });

  it("announces what is shown", async () => {
    const { wrapper, table } = mountWithTable<Person>(options, (t) =>
      h(DataTableRoot, { table: t }, () => h(DataTableStatus)),
    );
    const status = wrapper.get("[role=status]");
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.text()).toBe("1–3 of 7 rows");
    table().toggleRow(1);
    await nextTick();
    expect(status.text()).toBe("1–3 of 7 rows, 1 selected");
    table().search("zzz");
    await nextTick();
    expect(status.text()).toBe("No rows");
  });

  it("requires a table from an ancestor", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => mount(DataTableStatus)).toThrow(/<DataTableStatus> needs a table/u);
    warn.mockRestore();
  });
});
