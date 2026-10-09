import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

// Run only against an isolated production server/database; never alter the operator's stock.
const directory = await mkdtemp(join(tmpdir(), "vueye-acceptance-"));
const port = 4311;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    OPERATIONS_DB: join(directory, "operations.sqlite"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk;
});
server.stderr.on("data", (chunk) => {
  output += chunk;
});
const json = async (path) => {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  return response.json();
};
const save = (body) =>
  fetch(base + "/api/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await json("/api/health");
      ready = true;
      break;
    } catch {
      await setTimeout(250);
    }
  }
  assert.ok(ready, output);
  const health = await json("/api/health");
  assert.equal(health.orders, 100_000);
  assert.equal(health.stock, 2_000);
  for (const path of ["/", "/inventory", "/locations", "/receiving"]) {
    const response = await fetch(base + path);
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.match(html, /Operations desk/u);
    assert.ok(!html.includes("nuxt-error"), path);
  }
  const first = await json("/api/orders");
  const second = await json(`/api/orders?cursor=${first.cursor}`);
  assert.equal(first.rows.length, 100);
  assert.equal(second.rows[0].id, 101);
  assert.equal(new Set([...first.rows, ...second.rows].map((row) => row.id)).size, 200);
  const arabic = await json("/api/orders?search=" + encodeURIComponent("مكتبة الأفق"));
  assert.equal(arabic.total, 20_000);
  assert.ok(arabic.rows.every((row) => row.customer === "مكتبة الأفق"));
  assert.equal((await fetch(base + "/api/orders?fail=1")).status, 503);
  assert.equal((await json("/api/orders?cursor=200")).rows[0].id, 201);
  const rows = await json("/api/stock");
  const row = rows[0];
  const saved = await save({
    inserted: [],
    updated: [{ row: { ...row, quantity: 321 }, version: row.version }],
    removed: [],
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).rows[0].version, 2);
  assert.equal((await json("/api/stock"))[0].quantity, 321);
  assert.equal(
    (
      await save({
        inserted: [],
        updated: [{ row: { ...row, quantity: 999 }, version: row.version }],
        removed: [],
      })
    ).status,
    409,
  );
  assert.equal(
    (await save({ inserted: [{ ...row, id: "bad", quantity: -1 }], updated: [], removed: [] }))
      .status,
    422,
  );
  assert.equal((await json(`/api/sku?sku=${row.sku}&id=different`)).available, false);
  assert.equal((await json("/api/locations?parent=w0")).length, 12);
  assert.equal((await json("/api/locations?parent=w0-a0")).length, 24);
  const stream = await fetch(base + "/api/receiving?count=1000");
  const lines = (await stream.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(lines.length, 1_000);
  assert.equal(lines[0].message, "استلام شحنة · Étiquette vérifiée");
  const controller = new AbortController();
  const cancellable = await fetch(base + "/api/receiving?count=10000", {
    signal: controller.signal,
  });
  const reader = cancellable.body.getReader();
  await reader.read();
  controller.abort();
  await reader.cancel().catch(() => undefined);
  await setTimeout(150);
  assert.equal(
    (await json("/api/health")).activeStreams,
    0,
    "Aborted stream releases the server connection",
  );
  console.info(
    "HTTP acceptance passed: four SSR routes, 100k cursor/search, outage/retry, persisted save, 409/422 recovery, lazy branches, 1k Unicode stream, abort cleanup.",
  );
} finally {
  server.kill();
  if (server.exitCode === null) await new Promise((resolve) => server.once("close", resolve));
  await rm(directory, { recursive: true, force: true });
}
