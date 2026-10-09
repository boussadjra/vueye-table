import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  ORDER_COUNT,
  STOCK_COUNT,
  orderAt,
  stockAt,
  warehouses,
  type Stock,
  type Order,
} from "../../app/utils/operations.ts";

export class SaveError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export interface SaveBatch {
  readonly inserted: readonly Stock[];
  readonly updated: readonly { row: Stock; version: number }[];
  readonly removed: readonly { id: string; version: number }[];
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new SaveError(422, "Invalid save record.");
  return value as Record<string, unknown>;
}
function positiveVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new SaveError(422, "Invalid stock version.");
  return value;
}
function parseStock(value: unknown): Stock {
  const row = record(value);
  for (const key of ["id", "sku", "product"] as const) {
    if (typeof row[key] !== "string" || !row[key].trim() || row[key].length > 100)
      throw new SaveError(422, `Invalid ${key}.`);
  }
  for (const key of ["quantity", "reserved"] as const) {
    if (
      typeof row[key] !== "number" ||
      !Number.isSafeInteger(row[key]) ||
      row[key] < 0 ||
      row[key] > 1_000_000
    )
      throw new SaveError(422, `Invalid ${key}.`);
  }
  if (!warehouses.includes(row.warehouse as Stock["warehouse"]))
    throw new SaveError(422, "Unknown warehouse.");
  if (typeof row.cost !== "number" || !Number.isFinite(row.cost) || row.cost < 0)
    throw new SaveError(422, "Invalid cost.");
  if ((row.reserved as number) > (row.quantity as number))
    throw new SaveError(422, "Reserved units exceed quantity.");
  return {
    id: row.id as string,
    sku: row.sku as string,
    product: row.product as string,
    warehouse: row.warehouse as Stock["warehouse"],
    quantity: row.quantity as number,
    reserved: row.reserved as number,
    cost: row.cost,
    version: positiveVersion(row.version),
  };
}
export function parseBatch(value: unknown): SaveBatch {
  const batch = record(value);
  for (const key of ["inserted", "updated", "removed"] as const) {
    if (!Array.isArray(batch[key]) || batch[key].length > 2_000)
      throw new SaveError(422, `Invalid ${key} batch.`);
  }
  const inserted = (batch.inserted as unknown[]).map(parseStock);
  const updated = (batch.updated as unknown[]).map((entry) => {
    const item = record(entry);
    return { row: parseStock(item.row), version: positiveVersion(item.version) };
  });
  const removed = (batch.removed as unknown[]).map((entry) => {
    const item = record(entry);
    if (typeof item.id !== "string") throw new SaveError(422, "Invalid removed row.");
    return { id: item.id, version: positiveVersion(item.version) };
  });
  const keys = [
    ...inserted.map((row) => row.id),
    ...updated.map((item) => item.row.id),
    ...removed.map((item) => item.id),
  ];
  if (new Set(keys).size !== keys.length)
    throw new SaveError(422, "A row appears more than once in this save.");
  return { inserted, updated, removed };
}

export function createStore(path: string, orderCount = ORDER_COUNT, stockCount = STOCK_COUNT) {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, reference TEXT, customer TEXT, status TEXT, warehouse TEXT, total REAL, created TEXT); CREATE TABLE IF NOT EXISTS stock (id TEXT PRIMARY KEY, sku TEXT UNIQUE, product TEXT, warehouse TEXT, quantity INTEGER, reserved INTEGER, cost REAL, version INTEGER);",
  );
  if ((db.prepare("SELECT count(*) AS n FROM orders").get()?.n as number) === 0) {
    db.exec("BEGIN");
    const insert = db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (let i = 0; i < orderCount; i++) {
      const row = orderAt(i);
      insert.run(
        row.id,
        row.reference,
        row.customer,
        row.status,
        row.warehouse,
        row.total,
        row.created,
      );
    }
    const insertStock = db.prepare("INSERT INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (let i = 0; i < stockCount; i++) {
      const row = stockAt(i);
      insertStock.run(
        row.id,
        row.sku,
        row.product,
        row.warehouse,
        row.quantity,
        row.reserved,
        row.cost,
        row.version,
      );
    }
    db.exec("COMMIT");
  }
  const stock = () =>
    db
      .prepare("SELECT * FROM stock ORDER BY CAST(substr(id, 7) AS INTEGER), id")
      .all() as unknown as Stock[];
  const get = (id: string) =>
    db.prepare("SELECT * FROM stock WHERE id = ?").get(id) as unknown as Stock | undefined;
  function orders(search = "", sort = "id", descending = false, offset = 0, limit = 100) {
    const allowed = ["id", "reference", "customer", "status", "warehouse", "total", "created"];
    if (!allowed.includes(sort)) throw new SaveError(400, "Unknown order sort column.");
    if (!Number.isSafeInteger(offset) || offset < 0) throw new SaveError(400, "Invalid cursor.");
    const term = `%${search}%`;
    const total = db
      .prepare("SELECT count(*) AS n FROM orders WHERE reference LIKE ? OR customer LIKE ?")
      .get(term, term)?.n as number;
    const rows = db
      .prepare(
        `SELECT * FROM orders WHERE reference LIKE ? OR customer LIKE ? ORDER BY ${sort} ${descending ? "DESC" : "ASC"}, id ASC LIMIT ? OFFSET ?`,
      )
      .all(term, term, Math.min(100, Math.max(1, limit)), offset) as unknown as Order[];
    return { rows, total, cursor: offset + rows.length, done: offset + rows.length >= total };
  }
  function save(batch: SaveBatch) {
    const saved: Stock[] = [];
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const item of [
        ...batch.updated.map((change) => ({ id: change.row.id, version: change.version })),
        ...batch.removed,
      ]) {
        if (get(item.id)?.version !== item.version)
          throw new SaveError(409, `${item.id} changed in another session. Reload before saving.`);
      }
      for (const row of batch.inserted) {
        db.prepare("INSERT INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
          row.id,
          row.sku,
          row.product,
          row.warehouse,
          row.quantity,
          row.reserved,
          row.cost,
          1,
        );
        saved.push({ ...row, version: 1 });
      }
      for (const { row, version } of batch.updated) {
        db.prepare(
          "UPDATE stock SET sku=?, product=?, warehouse=?, quantity=?, reserved=?, cost=?, version=? WHERE id=?",
        ).run(
          row.sku,
          row.product,
          row.warehouse,
          row.quantity,
          row.reserved,
          row.cost,
          version + 1,
          row.id,
        );
        saved.push({ ...row, version: version + 1 });
      }
      for (const item of batch.removed) db.prepare("DELETE FROM stock WHERE id=?").run(item.id);
      db.exec("COMMIT");
      return {
        rows: saved,
        acknowledged: [...saved.map((row) => row.id), ...batch.removed.map((item) => item.id)],
      };
    } catch (error) {
      db.exec("ROLLBACK");
      if (error instanceof SaveError) throw error;
      throw new SaveError(422, "Save rejected: the SKU or stock ID already exists.");
    }
  }
  return {
    stock,
    get,
    orders,
    save,
    close: () => db.close(),
    skuAvailable: (sku: string, id: string) =>
      !db.prepare("SELECT id FROM stock WHERE sku=? AND id<>?").get(sku, id),
    compete: (id: string) => {
      db.prepare("UPDATE stock SET quantity=quantity+1, version=version+1 WHERE id=?").run(id);
      return get(id);
    },
  };
}
let instance: ReturnType<typeof createStore> | undefined;
export function getStore() {
  if (!instance) {
    const path = process.env.OPERATIONS_DB ?? resolve(".data/operations.sqlite");
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    instance = createStore(path);
  }
  return instance;
}
