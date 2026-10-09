export const PACKAGE_VERSION = "3.0.0-alpha.10";
export const ORDER_COUNT = 100_000;
export const STOCK_COUNT = 2_000;
export const warehouses = ["Algiers", "Lyon", "Rotterdam"] as const;
export type Warehouse = (typeof warehouses)[number];
export interface Stock {
  readonly id: string;
  readonly sku: string;
  readonly product: string;
  readonly warehouse: Warehouse;
  readonly quantity: number;
  readonly reserved: number;
  readonly cost: number;
  readonly version: number;
}
export interface Order {
  readonly id: number;
  readonly reference: string;
  readonly customer: string;
  readonly status: string;
  readonly warehouse: Warehouse;
  readonly total: number;
  readonly created: string;
}
export interface Location {
  readonly id: string;
  readonly name: string;
  readonly kind: "warehouse" | "aisle" | "bin";
  readonly capacity: number;
}
export interface ReceivingEvent {
  readonly id: number;
  readonly reference: string;
  readonly warehouse: Warehouse;
  readonly quantity: number;
  readonly message: string;
}
function cycle<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length];
  if (value === undefined) throw new RangeError("Synthetic row index must be nonnegative");
  return value;
}
export function orderAt(index: number): Order {
  const names = ["Atlas Lab", "Éditions du Port", "مكتبة الأفق", "Northern Supply", "Maison Réseau"];
  return {
    id: index + 1,
    reference: `SO-${String(index + 1).padStart(6, "0")}`,
    customer: cycle(names, index),
    status: cycle(["Queued", "Picking", "Shipped", "Held"], index),
    warehouse: cycle(warehouses, index),
    total: ((index * 7919) % 200_000) / 100,
    created: new Date(Date.UTC(2026, 0, 1) + (index % 365) * 86_400_000).toISOString().slice(0, 10),
  };
}
export function stockAt(index: number): Stock {
  return {
    id: `stock-${index + 1}`,
    sku: `SKU-${String(index + 1).padStart(5, "0")}`,
    product: cycle(
      ["Field notebook", "USB-C dock", "Label roll", "Scanner", "Protective case"],
      index,
    ),
    warehouse: cycle(warehouses, index),
    quantity: 100 + (index % 500),
    reserved: index % 40,
    cost: 3.5 + (index % 240),
    version: 1,
  };
}
export function locationChildren(parent: string | undefined): readonly Location[] {
  if (parent === undefined)
    return warehouses.map((name, index) => ({
      id: `w${index}`,
      name,
      kind: "warehouse",
      capacity: 20_000,
    }));
  if (/^w\d$/u.test(parent))
    return Array.from({ length: 12 }, (_, index) => ({
      id: `${parent}-a${index}`,
      name: `Aisle ${index + 1}`,
      kind: "aisle",
      capacity: 1_600,
    }));
  if (/^w\d-a\d+$/u.test(parent))
    return Array.from({ length: 24 }, (_, index) => ({
      id: `${parent}-b${index}`,
      name: `Bin ${String(index + 1).padStart(2, "0")}`,
      kind: "bin",
      capacity: 64,
    }));
  return [];
}
export function money(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}
