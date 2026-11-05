import assert from "node:assert/strict";
import { test } from "node:test";

import deepmerge from "deepmerge";

await test("deepmerge does not poison the result prototype through target keys", () => {
  const target = JSON.parse('{"__proto__":{"poisoned":true},"safe":1}');
  const merged = deepmerge(target, { another: 2 });
  assert.equal(Object.getPrototypeOf(merged), Object.prototype);
  assert.equal(Reflect.get(merged, "poisoned"), undefined);
  assert.equal(merged.safe, 1);
  assert.equal(merged.another, 2);
});

await test("deepmerge safely handles source keys with a null-prototype target", () => {
  const source = JSON.parse('{"__proto__":{"poisoned":true},"safe":1}');
  const merged = deepmerge(Object.create(null), source);
  assert.equal(Object.getPrototypeOf(merged), Object.prototype);
  assert.equal(Reflect.get(merged, "poisoned"), undefined);
  assert.equal(merged.safe, 1);
});

await test("deepmerge retains nested object and array merging", () => {
  assert.deepEqual(
    deepmerge({ nested: { a: 1 }, values: [1] }, { nested: { b: 2 }, values: [2] }),
    {
      nested: { a: 1, b: 2 },
      values: [1, 2],
    },
  );
});
