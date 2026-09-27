import { createTable, type TableSnapshot, type TableState } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

import { people, type Person } from "../fixtures";

const keys = (snapshot: TableSnapshot<Person>): unknown[] => snapshot.rows.map((row) => row.key);

function peopleTable(options: Partial<Parameters<typeof createTable<Person>>[0]> = {}) {
  return createTable<Person>({
    data: people,
    columns: [
      { id: "name.first", header: "First" },
      { id: "age", align: "end" },
      { id: "city" },
      { id: "active", searchable: false },
      { id: "email", accessor: (row) => `${row.name.first.toLowerCase()}@example.com` },
    ],
    initialState: { pagination: { page: 1, pageSize: 3 } },
    ...options,
  });
}

describe("createTable", () => {
  it("pages rows and describes the page", () => {
    const table = peopleTable();
    const snapshot = table.getSnapshot();
    expect(keys(snapshot)).toEqual([1, 2, 3]);
    expect(snapshot.pageCount).toBe(3);
    expect(snapshot.rowCount).toBe(7);
    expect(snapshot.pageStart).toBe(1);
    expect(snapshot.pageEnd).toBe(3);
    expect(snapshot.canPreviousPage).toBe(false);
    expect(snapshot.canNextPage).toBe(true);
    expect(snapshot.columns.map((column) => column.header)).toEqual([
      "First",
      "Age",
      "City",
      "Active",
      "Email",
    ]);
  });

  it("keeps the snapshot until something changes", () => {
    const table = peopleTable();
    const first = table.getSnapshot();
    expect(table.getSnapshot()).toBe(first);
    table.goToPage(2);
    expect(table.getSnapshot()).not.toBe(first);
    expect(Object.isFrozen(table.getSnapshot())).toBe(true);
  });

  it("clamps pages and moves through them", () => {
    const table = peopleTable();
    table.goToPage(99);
    expect(table.getSnapshot().page).toBe(3);
    expect(keys(table.getSnapshot())).toEqual([7]);
    table.previousPage();
    expect(table.getSnapshot().page).toBe(2);
    table.nextPage();
    table.nextPage();
    expect(table.getSnapshot().page).toBe(3);
    table.goToPage(-4);
    expect(table.getSnapshot().page).toBe(1);
  });

  it("keeps the first visible row in view when the page size changes", () => {
    const table = peopleTable();
    table.goToPage(3);
    table.setPageSize(2);
    expect(table.getState().pagination).toEqual({ page: 4, pageSize: 2 });
    table.setPageSize(0);
    expect(table.getState().pagination.pageSize).toBe(2);
  });

  it("searches every searchable column, all terms required", () => {
    const table = peopleTable();
    table.search("boston");
    expect(table.getSnapshot().processedRows.map((row) => row.key)).toEqual([5, 7]);
    table.search("boston mar");
    expect(table.getSnapshot().processedRows.map((row) => row.key)).toEqual([7]);
    table.search("true");
    expect(table.getSnapshot().rowCount).toBe(0);
    expect(table.getSnapshot().pageCount).toBe(1);
    expect(table.getSnapshot().pageStart).toBe(0);
    table.search("example.com");
    expect(table.getSnapshot().rowCount).toBe(7);
  });

  it("resets to the first page on search, filter, and sort", () => {
    const table = peopleTable();
    table.goToPage(2);
    table.search("a");
    expect(table.getState().pagination.page).toBe(1);
    table.goToPage(2);
    table.filter("active", true);
    expect(table.getState().pagination.page).toBe(1);
    table.goToPage(2);
    table.toggleSort("age");
    expect(table.getState().pagination.page).toBe(1);
  });

  it("filters by column and removes empty filters", () => {
    const table = peopleTable();
    table.filter("active", true);
    table.filter("age", { min: 50 });
    expect(table.getSnapshot().processedRows.map((row) => row.key)).toEqual([3, 6]);
    table.filter("age", undefined);
    expect(table.getState().filters).toEqual({ active: true });
    table.filter("age", undefined);
    table.clearFilters();
    expect(table.getState().filters).toEqual({});
  });

  it("cycles sorting and keeps empty values last", () => {
    const table = peopleTable({ initialState: { pagination: { page: 1, pageSize: 10 } } });
    table.toggleSort("age");
    expect(keys(table.getSnapshot())).toEqual([1, 2, 4, 3, 6, 7, 5]);
    table.toggleSort("age");
    expect(keys(table.getSnapshot())).toEqual([7, 6, 3, 4, 2, 1, 5]);
    table.toggleSort("age");
    expect(table.getState().sorting).toEqual([]);
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("sorts by several columns in priority order", () => {
    const table = peopleTable({ initialState: { pagination: { page: 1, pageSize: 10 } } });
    table.sort("city", "asc");
    table.sort("name.first", "desc", { multi: true });
    expect(keys(table.getSnapshot()).slice(0, 3)).toEqual([3, 7, 5]);
    expect(table.getSnapshot().getSort("name.first")).toEqual({ direction: "desc", priority: 1 });
    table.toggleSort("city", { multi: true });
    expect(table.getState().sorting).toEqual([
      { column: "city", direction: "desc" },
      { column: "name.first", direction: "desc" },
    ]);
    table.toggleSort("age");
    expect(table.getState().sorting).toEqual([{ column: "age", direction: "asc" }]);
    table.clearSorting();
    expect(table.getState().sorting).toEqual([]);
  });

  it("ignores sorting on unsortable or unknown columns", () => {
    const table = createTable<Person>({ data: people, columns: [{ id: "city", sortable: false }] });
    table.toggleSort("city");
    table.toggleSort("nope");
    expect(table.getState().sorting).toEqual([]);
  });

  it("selects rows across pages and toggles all in scope", () => {
    const table = peopleTable();
    table.toggleRow(1);
    table.toggleRow(5);
    expect(table.getSnapshot().pageSelection).toBe("some");
    expect(table.getSnapshot().selectedCount).toBe(2);
    expect(table.getSelectedRows().map((row) => row.key)).toEqual([1, 5]);
    table.toggleAll();
    expect(table.getSnapshot().allSelection).toBe("all");
    expect(table.getSnapshot().selectedCount).toBe(7);
    table.toggleAll();
    expect(table.getSnapshot().selectedCount).toBe(0);
    table.toggleAll("page");
    expect(table.getState().selection).toEqual([1, 2, 3]);
    expect(table.getSnapshot().pageSelection).toBe("all");
    table.toggleRow(2, true);
    table.toggleRow(2, false);
    table.clearSelection();
    expect(table.getSnapshot().pageSelection).toBe("none");
  });

  it("honors single and disabled selection", () => {
    const single = peopleTable({ selectionMode: "single" });
    single.select([1, 2]);
    expect(single.getState().selection).toEqual([2]);
    single.toggleAll();
    expect(single.getState().selection).toEqual([2]);
    const none = peopleTable({ selectionMode: "none" });
    none.toggleRow(1);
    expect(none.getState().selection).toEqual([]);
  });

  it("scopes select-all to the page when asked", () => {
    const table = peopleTable({ selectScope: "page" });
    table.toggleAll();
    expect(table.getState().selection).toEqual([1, 2, 3]);
    expect(table.getSnapshot().allSelection).toBe("all");
  });

  it("hides, shows, and reorders columns", () => {
    const table = peopleTable();
    table.toggleColumn("city");
    expect(table.getSnapshot().columns.map((column) => column.id)).not.toContain("city");
    expect(table.getSnapshot().allColumns).toHaveLength(5);
    table.toggleColumn("city", true);
    table.toggleColumn("city", true);
    table.toggleColumn("missing");
    table.moveColumn("email", 0);
    expect(table.getSnapshot().columns[0]?.id).toBe("email");
    table.moveColumn("email", 0);
    table.moveColumn("missing", 1);
    expect(table.getState().columnOrder).toEqual(["email", "name.first", "age", "city", "active"]);
  });

  it("starts columns marked hidden as hidden", () => {
    const table = createTable<Person>({
      data: people,
      columns: [{ id: "city" }, { id: "age", hidden: true }],
    });
    expect(table.getState().hiddenColumns).toEqual(["age"]);
  });

  it("notifies subscribers and reports operation changes once", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = peopleTable({ onStateChange });
    const listener = vi.fn<(snapshot: TableSnapshot<Person>) => void>();
    const unsubscribe = table.subscribe(listener);
    table.goToPage(2);
    table.goToPage(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    table.setState({ search: "ada" });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    table.setState({ search: "ada", pagination: { page: 1, pageSize: 3 } });
    expect(listener).toHaveBeenCalledTimes(3);
    table.setState({ pagination: { page: 1, pageSize: 3 } });
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    table.reset();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(table.getState().search).toBe("");
    table.destroy();
  });

  it("reports duplicate keys and unknown columns instead of failing silently", () => {
    const table = createTable({
      data: [
        { id: 1, name: "a" },
        { id: 1, name: "b" },
      ],
      columns: [{ id: "name" }],
      initialState: { sorting: [{ column: "ghost", direction: "asc" }] },
    });
    const { issues, rows } = table.getSnapshot();
    expect(rows.map((row) => row.key)).toEqual([1, "1#1"]);
    expect(issues.map((issue) => issue.code)).toEqual(["duplicate_row_key", "unknown_column"]);
  });

  it("recovers from an invalid page size and reports it", () => {
    const table = createTable({
      data: people,
      columns: [{ id: "id" }],
      initialState: { pagination: { page: 1, pageSize: 0 } },
    });
    expect(table.getSnapshot().pageSize).toBe(10);
    expect(table.getSnapshot().issues[0]?.code).toBe("invalid_page_size");
  });

  it("keys rows by a path, a function, or position", () => {
    const byPath = createTable<Person>({ data: people, columns: [], rowKey: "name.last" });
    expect(byPath.getSnapshot().rows[0]?.key).toBe("Lovelace");
    const byFunction = createTable<Person>({
      data: people,
      columns: [],
      rowKey: (row) => `p${row.id}`,
    });
    expect(byFunction.getSnapshot().rows[0]?.key).toBe("p1");
    const byIndex = createTable({ data: [{ a: 1 }, { a: 2 }], columns: [] });
    expect(byIndex.getSnapshot().rows.map((row) => row.key)).toEqual([0, 1]);
  });

  it("presents manual data as one page of a server result", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = createTable<Person>({
      data: people.slice(0, 3),
      columns: [{ id: "city" }],
      manual: true,
      rowCount: 30,
      onStateChange,
      initialState: { pagination: { page: 2, pageSize: 3 } },
    });
    let snapshot = table.getSnapshot();
    expect(snapshot.rows).toHaveLength(3);
    expect(snapshot.pageCount).toBe(10);
    expect(snapshot.pageStart).toBe(4);
    table.search("zzz");
    expect(table.getSnapshot().rows).toHaveLength(3);
    expect(onStateChange).toHaveBeenCalledOnce();
    table.setRowCount(6);
    table.setRowCount(6);
    snapshot = table.getSnapshot();
    expect(snapshot.pageCount).toBe(2);
    table.toggleAll();
    expect(table.getState().selection).toEqual([1, 2, 3]);
  });

  it("replaces data and columns", () => {
    const table = peopleTable();
    const listener = vi.fn<(snapshot: TableSnapshot<Person>) => void>();
    table.subscribe(listener);
    table.setData(people.slice(0, 2));
    table.setData(table.getSnapshot().rows.map((row) => row.original));
    expect(table.getSnapshot().rowCount).toBe(2);
    const columns = [{ id: "city" as const }];
    table.setColumns(columns);
    table.setColumns(columns);
    expect(table.getSnapshot().columns.map((column) => column.id)).toEqual(["city"]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("exports filtered rows as CSV or TSV", () => {
    const table = peopleTable();
    table.search("boston");
    expect(table.exportRows({ columns: ["name.first", "city", "ghost"] })).toBe(
      "First,City\nBarbara,Boston\nMargaret,Boston",
    );
    expect(
      table.exportRows({ format: "tsv", headers: false, pageOnly: true, columns: ["age"] }),
    ).toBe("\n90");
  });
});
