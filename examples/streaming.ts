import { createTable, type StreamResult } from "@vueye-table/core";

interface EventRow {
  readonly id: number;
  readonly item: string;
  readonly quantity: number;
}
const table = createTable<EventRow>({
  data: [],
  columns: [{ id: "item" }, { id: "quantity", editable: true }],
  paginate: false,
});
table.subscribe((snapshot) => {
  console.log(
    `${snapshot.loadState}: ${snapshot.loadedRowCount}/${snapshot.expectedRowCount ?? "?"} rows`,
  );
});
async function* deliveries(): AsyncGenerator<readonly EventRow[]> {
  yield [
    { id: 1, item: "Keyboard", quantity: 2 },
    { id: 2, item: "Monitor", quantity: 1 },
  ];
  yield [{ id: 3, item: "Cable", quantity: 4 }];
}
const result: StreamResult = await table.stream(deliveries(), {
  batchSize: 2,
  expectedRowCount: 3,
});
if (result.status !== "done" || result.receivedRowCount !== 3)
  throw new Error("The sample source did not complete.");
table.edit({ rowKey: 1, column: "quantity", value: 5 });
const conflicting = table.upsertData([{ id: 1, item: "Keyboard", quantity: 99 }]);
console.log(
  `Incoming update: ${conflicting.issues[0]?.code}; local quantity: ${String(table.getSnapshot().getRow(1)?.getValue("quantity"))}`,
);
table.appendData([{ id: 4, item: "Stand", quantity: 1 }]);
table.undo();
console.log(
  `After undo: quantity ${String(table.getSnapshot().getRow(1)?.getValue("quantity"))}; ${table.getSnapshot().loadedRowCount} source rows retained`,
);
if (
  table.getSnapshot().loadedRowCount !== 4 ||
  table.getSnapshot().getRow(1)?.getValue("quantity") !== 2
)
  throw new Error("The sample edit/source integration failed.");
const controller = new AbortController();
controller.abort();
const aborted = await table.stream(deliveries(), { signal: controller.signal });
console.log(`Pre-aborted source: ${aborted.status}`);
if (aborted.status !== "aborted") throw new Error("The sample cancellation failed.");
table.destroy();
