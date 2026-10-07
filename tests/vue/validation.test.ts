import type { ValidationResult } from "@vueye-table/core";
import { useDataTable } from "@vueye-table/vue";
import { expect, it } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

it("forwards structural and saved-baseline operations while preserving raw v-model round trips", async () => {
  const scope = effectScope();
  const rows = shallowRef<readonly { id: number; name: string }[]>([{ id: 1, name: "A" }]);
  const table = scope.run(() =>
    useDataTable({
      data: rows,
      columns: [{ id: "name", editable: true }],
      createRow: () => ({ id: 2, name: "B" }),
      onDataChange: (next) => {
        rows.value = next;
      },
    }),
  )!;
  table.insertRows();
  await nextTick();
  expect(table.rows).toHaveLength(2);
  expect(table.getPendingChanges().inserted).toHaveLength(1);
  table.edit({ rowKey: 1, column: "name", value: "C" });
  await nextTick();
  expect(table.getRow(1)?.isDirty).toBe(true);
  table.markSaved([1]);
  expect(table.getRow(1)?.isDirty).toBe(false);
  table.revert();
  await nextTick();
  expect(table.rows.map((row) => row.key)).toEqual([1]);
  table.undo();
  await nextTick();
  table.removeRows([1]);
  await nextTick();
  expect(table.getPendingChanges().removed).toHaveLength(1);
  scope.stop();
});

it("fences async validation when a Vue effect scope is disposed", async () => {
  let resolve!: (result: ValidationResult) => void;
  const request = new Promise<ValidationResult>((done) => {
    resolve = done;
  });
  const scope = effectScope();
  const table = scope.run(() =>
    useDataTable({
      data: [{ id: 1, name: "A" }],
      columns: [{ id: "name", editable: true, validate: () => request }],
    }),
  )!;
  expect(table.edit({ rowKey: 1, column: "name", value: "B" }).status).toBe("pending");
  expect(table.pendingCells).toHaveLength(1);
  scope.stop();
  resolve(true);
  await nextTick();
  await nextTick();
  expect(table.getRow(1)?.original.name).toBe("A");
});
