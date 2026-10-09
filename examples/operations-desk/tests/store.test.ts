import assert from "node:assert/strict";
import test from "node:test";

import { stockAt } from "../app/utils/operations.ts";
import { createStore, parseBatch, SaveError } from "../server/utils/store.ts";

await test("an actual SQLite save persists a batch and rejects another clerk's stale revision atomically", () => {
  const store = createStore(":memory:", 50, 20);
  try {
    const first = stockAt(0);
    const second = stockAt(1);
    const result = store.save(
      parseBatch({
        inserted: [],
        updated: [{ row: { ...first, quantity: 220 }, version: 1 }],
        removed: [],
      }),
    );
    assert.equal(result.rows[0]?.version, 2);
    assert.equal(store.get(first.id)?.quantity, 220);
    store.compete(first.id);
    assert.throws(
      () =>
        store.save(
          parseBatch({
            inserted: [],
            updated: [
              { row: { ...second, quantity: 999 }, version: 1 },
              { row: { ...first, quantity: 230 }, version: 2 },
            ],
            removed: [],
          }),
        ),
      (error: unknown) => error instanceof SaveError && error.status === 409,
    );
    assert.deepEqual(
      { ...store.get(second.id) },
      second,
      "No earlier row from the rejected transaction is saved",
    );
  } finally {
    store.close();
  }
});

await test("the server rejects invalid batches instead of trusting client editors", () => {
  const store = createStore(":memory:", 20, 10);
  try {
    const row = stockAt(0);
    for (const patch of [
      { quantity: -1 },
      { reserved: 9999 },
      { warehouse: "Unknown" },
      { cost: null },
      { version: 0 },
    ]) {
      assert.throws(
        () => parseBatch({ inserted: [{ ...row, ...patch }], updated: [], removed: [] }),
        SaveError,
      );
    }
    assert.throws(() => parseBatch({ inserted: [row, row], updated: [], removed: [] }), SaveError);
    assert.throws(
      () =>
        store.save(parseBatch({ inserted: [{ ...row, id: "new-1" }], updated: [], removed: [] })),
      SaveError,
    );
    assert.equal(store.stock().length, 10);
  } finally {
    store.close();
  }
});

await test("cursor queries are deterministic and sort input cannot become SQL", () => {
  const store = createStore(":memory:", 350, 10);
  try {
    const first = store.orders("Atlas", "total", true);
    const next = store.orders("Atlas", "total", true, first.cursor);
    assert.equal(first.total, 70);
    assert.equal(first.done, true);
    assert.equal(next.rows.length, 0);
    assert.ok(
      first.rows.every((row, index, rows) => {
        const previous = rows[index - 1];
        return !previous || previous.total >= row.total;
      }),
    );
    assert.throws(() => store.orders("", "id; DROP TABLE stock"), SaveError);
    assert.throws(() => store.orders("", "id", false, -1), SaveError);
  } finally {
    store.close();
  }
});
