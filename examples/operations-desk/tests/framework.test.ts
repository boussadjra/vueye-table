import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { createTable, type ColumnDef } from "@vueye-table/core";

import { stockAt, type Stock } from "../app/utils/operations.ts";

const columns: readonly ColumnDef<Stock>[] = [
  { id: "sku", editable: true },
  { id: "quantity", type: "number", editable: true, editor: { kind: "number", min: 0 } },
  { id: "reserved", type: "number", editable: true },
];
await test("100k frozen consumer rows keep identity and source updates across edit undo", () => {
  const rows = Object.freeze(
    Array.from({ length: 100_000 }, (_, index) => Object.freeze(stockAt(index))),
  );
  const started = performance.now();
  const table = createTable<Stock>({ data: rows, columns, rowKey: "id", paginate: false });
  try {
    table.edit({ rowKey: "stock-100000", column: "quantity", value: 700 });
    assert.equal(rows[99_999]?.quantity, 599, "Frozen caller input is unchanged");
    const conflict = table.upsertData([{ ...stockAt(99_999), quantity: 900 }]);
    assert.ok(conflict.issues.length > 0, "Dirty source updates must report a conflict");
    table.appendData([{ ...stockAt(100_000) }]);
    table.undo();
    assert.equal(table.getSnapshot().getRow("stock-100000")?.original.quantity, 599);
    assert.equal(table.getSnapshot().loadedRowCount, 100_001);
    assert.equal(table.getPendingChanges().updated.length, 0);
    console.info(
      `100k create/edit/conflict/append/undo: ${(performance.now() - started).toFixed(1)} ms (local measurement)`,
    );
  } finally {
    table.destroy();
  }
});

await test("a slow uniqueness response cannot overwrite a newer edit", async () => {
  const resolvers = new Map<string, (value: true | string) => void>();
  const table = createTable<Stock>({
    data: [stockAt(0)],
    columns: [
      {
        id: "sku",
        editable: true,
        validate: (value) => new Promise<true | string>((resolve) => resolvers.set(value, resolve)),
      },
    ],
    rowKey: "id",
  });
  try {
    const slow = table.edit({ rowKey: "stock-1", column: "sku", value: "SLOW" });
    const fresh = table.edit({ rowKey: "stock-1", column: "sku", value: "FRESH" });
    resolvers.get("FRESH")!(true);
    await fresh.completion;
    resolvers.get("SLOW")!("SKU taken");
    await slow.completion;
    assert.equal(table.getSnapshot().getRow("stock-1")?.original.sku, "FRESH");
    assert.equal(table.getSnapshot().pendingCells.length, 0);
  } finally {
    table.destroy();
  }
});

await test("invalid multi-cell batches report recovery and leave untouched source rows intact", () => {
  const row = Object.freeze(stockAt(0));
  const table = createTable<Stock>({
    data: Object.freeze([row]),
    columns,
    validateRow: (next) => next.reserved <= next.quantity || "Reserved exceeds quantity",
  });
  try {
    const result = table.edit([
      { rowKey: row.id, column: "quantity", value: -5 },
      { rowKey: row.id, column: "sku", value: "=1+1" },
    ]);
    assert.equal(result.status, "partial");
    assert.ok(result.issues.length > 0);
    assert.equal(table.getSnapshot().getRow(row.id)?.original.quantity, row.quantity);
    assert.match(table.exportRows(), /'=1\+1/u);
    table.revert();
    assert.equal(table.getPendingChanges().updated.length, 0);
  } finally {
    table.destroy();
  }
});

await test("cancelled HTTP-shaped streams preserve received batches and report abort", async () => {
  const controller = new AbortController();
  const table = createTable<Stock>({ data: [], columns, paginate: false });
  try {
    async function* source() {
      yield [stockAt(0)];
      controller.abort();
      yield [stockAt(1)];
    }
    const result = await table.stream(source(), { signal: controller.signal, batchSize: 1 });
    assert.equal(result.status, "aborted");
    assert.equal(table.getSnapshot().loadedRowCount, 1);
    assert.equal(table.getPendingChanges().inserted.length, 0, "Ingestion is not a user insertion");
  } finally {
    table.destroy();
  }
});
