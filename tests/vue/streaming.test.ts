import { useDataTable } from "@vueye-table/vue";
import { expect, it } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

it("exposes source operations/load metadata and keeps stream/edit records through the data round trip", async () => {
  const rows = shallowRef<readonly { id: number; value: number }[]>([{ id: 1, value: 1 }]);
  const scope = effectScope();
  const table = scope.run(() =>
    useDataTable({
      data: rows,
      columns: [{ id: "value", editable: true }],
      onDataChange: (data) => {
        rows.value = data;
      },
    }),
  )!;
  async function* source() {
    yield [
      { id: 2, value: 2 },
      { id: 3, value: 3 },
    ];
  }
  const result = await table.stream(source(), { batchSize: 1, expectedRowCount: 3 });
  await nextTick();
  expect(result.status).toBe("done");
  expect(table.loadState).toBe("done");
  expect(table.loadedRowCount).toBe(3);
  expect(table.expectedRowCount).toBe(3);
  table.edit({ rowKey: 1, column: "value", value: 10 });
  await nextTick();
  table.appendData([{ id: 4, value: 4 }]);
  await nextTick();
  expect(table.canUndo).toBe(true);
  expect(table.getPendingChanges().updated).toHaveLength(1);
  table.undo();
  table.upsertData([{ id: 2, value: 20 }]);
  table.removeData([3]);
  await nextTick();
  expect(rows.value.map((row) => row.value)).toEqual([1, 20, 4]);
  scope.stop();
});

it("scope disposal aborts a blocked source", async () => {
  const scope = effectScope();
  const table = scope.run(() =>
    useDataTable({ data: [] as readonly { id: number }[], columns: [{ id: "id" }] }),
  )!;
  const source = {
    [Symbol.asyncIterator]: () => ({
      next: () => new Promise<IteratorResult<{ id: number }>>(() => undefined),
    }),
  };
  const task = table.stream(source);
  expect(table.loadState).toBe("loading");
  scope.stop();
  expect((await task).status).toBe("aborted");
  expect(table.loadedRowCount).toBe(0);
});
