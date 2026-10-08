import { defineColumns } from "vueye-table";

export const CATEGORIES = ["Audio", "Computing", "Home", "Outdoor"] as const;
export const WAREHOUSES = ["Rotterdam", "Atlanta", "Singapore"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Warehouse = (typeof WAREHOUSES)[number];
export type StockStatus = "In stock" | "Low" | "Out";

export interface StockItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly category: Category;
  readonly warehouse: Warehouse;
  readonly onHand: number;
  readonly reorderPoint: number;
  readonly unitCost: number;
}

/** One accepted cell edit, as the change log shows it. */
export interface ChangeEntry {
  readonly id: number;
  /** "E7", or empty when the row has left the current view. */
  readonly reference: string;
  readonly sku: string;
  readonly product: string;
  readonly column: string;
  readonly previous: string;
  readonly value: string;
  /** For numbers: which way the value moved, and by how much, as text. */
  readonly delta?: { readonly direction: "up" | "down"; readonly text: string } | undefined;
}

/** Out when nothing is on hand, low at or under the reorder point. */
export function stockStatus(item: StockItem): StockStatus {
  if (item.onHand === 0) {
    return "Out";
  }
  return item.onHand <= item.reorderPoint ? "Low" : "In stock";
}

export function stockValue(item: StockItem): number {
  return Math.round(item.onHand * item.unitCost * 100) / 100;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(value: number): string {
  return money.format(value);
}

// ---------------------------------------------------------------------------------------------
// Parsing typed and pasted text. A thrown error rejects the cell and becomes an `edit-error`
// issue carrying this message.

/** A whole, non-negative quantity. An emptied cell means none on hand. */
function quantity(label: string): (input: string) => number {
  return (input) => {
    const text = input.trim().replace(/[\s,_]/gu, "");
    if (text === "") {
      return 0;
    }
    const value = Number(text);
    if (!/^[-+]?\d*\.?\d+$/u.test(text) || !Number.isFinite(value)) {
      throw new Error(`${label} must be a number, not "${input.trim()}".`);
    }
    if (value < 0) {
      throw new Error(`${label} can't be negative (you entered ${text}).`);
    }
    if (!Number.isInteger(value)) {
      throw new Error(`${label} counts whole units (you entered ${text}).`);
    }
    return value;
  };
}

/**
 * A price in dollars. Accepts "$12.50", "1,249.00", and a decimal comma such as "12,50"; a comma
 * followed by exactly two digits and no point is read as the decimal separator.
 */
export function parseMoney(input: string): number {
  let text = input.replace(/[\s$]/gu, "");
  if (text === "") {
    throw new Error("Unit cost can't be empty.");
  }
  text = /^[-+]?\d+,\d{2}$/u.test(text) ? text.replace(",", ".") : text.replaceAll(",", "");
  const value = Number(text);
  if (!/^[-+]?\d*\.?\d+$/u.test(text) || !Number.isFinite(value)) {
    throw new Error(`Unit cost must be an amount like 12.50, not "${input.trim()}".`);
  }
  if (value < 0) {
    throw new Error(`Unit cost can't be negative (you entered ${input.trim()}).`);
  }
  return Math.round(value * 100) / 100;
}

/** One of a fixed list, matched without regard to case, so pasted text lands on the real value. */
function oneOf<T extends string>(label: string, options: readonly T[]): (input: string) => T {
  return (input) => {
    const found = options.find((option) => option.toLowerCase() === input.trim().toLowerCase());
    if (!found) {
      throw new Error(`${label} must be one of ${options.join(", ")}; "${input.trim()}" is not.`);
    }
    return found;
  };
}

function required(label: string): (input: string) => string {
  return (input) => {
    if (input.trim() === "") {
      throw new Error(`${label} can't be empty.`);
    }
    return input.trim();
  };
}

const RANK: Record<StockStatus, number> = { Out: 0, Low: 1, "In stock": 2 };

export const columns = defineColumns<StockItem>([
  {
    id: "sku",
    header: "SKU",
    minWidth: 120,
    parse: required("SKU"),
    editor: { kind: "text", maxLength: 24 },
  },
  { id: "name", header: "Product", minWidth: 210, parse: required("Product name") },
  {
    id: "category",
    minWidth: 110,
    parse: oneOf("Category", CATEGORIES),
    editor: { kind: "select", options: CATEGORIES },
  },
  {
    id: "warehouse",
    minWidth: 116,
    parse: oneOf("Warehouse", WAREHOUSES),
    editor: { kind: "select", options: WAREHOUSES },
  },
  {
    id: "onHand",
    header: "On hand",
    align: "end",
    minWidth: 150,
    parse: quantity("On hand"),
    editor: { kind: "number", min: 0 },
  },
  {
    id: "reorderPoint",
    header: "Reorder at",
    align: "end",
    minWidth: 104,
    parse: quantity("Reorder point"),
    editor: { kind: "number", min: 0 },
  },
  {
    id: "unitCost",
    header: "Unit cost",
    align: "end",
    minWidth: 108,
    // Copy and CSV use formatted text; the typed editor starts from the underlying number.
    format: (cost) => cost.toFixed(2),
    parse: parseMoney,
    editor: { kind: "number", min: 0 },
  },
  {
    id: "value",
    header: "Stock value",
    accessor: stockValue,
    format: (value: number) => value.toFixed(2),
    align: "end",
    minWidth: 128,
  },
  {
    id: "status",
    accessor: stockStatus,
    // Order by urgency rather than alphabetically.
    compare: (left: StockStatus, right: StockStatus) => RANK[left] - RANK[right],
    minWidth: 108,
  },
]);

// ---------------------------------------------------------------------------------------------
// Deterministic sample data: a seeded generator, so the server render and the browser agree.

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS: Record<Category, readonly [string, number][]> = {
  Audio: [
    ["Studio monitor headphones", 64],
    ["Wireless earbuds", 38],
    ["Bookshelf speaker pair", 142],
    ["USB condenser microphone", 57],
    ["Portable Bluetooth speaker", 29],
    ["Turntable, belt drive", 118],
    ["Soundbar 2.1", 96],
    ["Headphone amplifier", 74],
    ["XLR cable, 3 m", 6.4],
    ["Mic boom arm", 18.5],
  ],
  Computing: [
    ['27" 4K monitor', 229],
    ["Mechanical keyboard", 52],
    ["Ergonomic mouse", 21.9],
    ["USB-C dock, 11-in-1", 71],
    ["1 TB NVMe drive", 48],
    ["Laptop stand, aluminium", 16.75],
    ["Webcam 1080p", 27],
    ["USB-C cable, 2 m", 3.2],
    ["Wi-Fi 6 router", 88],
    ["Graphics tablet", 61],
  ],
  Home: [
    ["Smart bulb, E27", 7.9],
    ["Air purifier", 104],
    ["Robot vacuum", 176],
    ["Espresso grinder", 83],
    ["Linen throw blanket", 22],
    ["Ceramic pour-over set", 14.6],
    ["Smart plug, 2-pack", 11.4],
    ["Desk lamp, dimmable", 26],
    ["Cast-iron skillet", 19.3],
    ["Wall clock, oak", 17],
  ],
  Outdoor: [
    ["Two-person tent", 97],
    ["Down sleeping bag", 112],
    ["Trekking poles", 24.5],
    ["Headlamp, 400 lm", 12.8],
    ["Insulated bottle, 1 L", 9.6],
    ["Camp stove", 36],
    ["Rain shell jacket", 58],
    ["Daypack, 24 L", 31],
    ["Water filter", 21],
    ["Folding camp chair", 15.2],
  ],
};

const PREFIX: Record<Category, string> = {
  Audio: "AUD",
  Computing: "CMP",
  Home: "HOM",
  Outdoor: "OUT",
};

function createInventory(): readonly StockItem[] {
  const random = mulberry32(20_260_930);
  const items: StockItem[] = [];
  for (const category of CATEGORIES) {
    PRODUCTS[category].forEach(([name, unitCost], index) => {
      const reorderPoint = 5 * (2 + Math.floor(random() * 8));
      const roll = random();
      // Roughly one in eight out of stock and one in five running low.
      const onHand =
        roll < 0.12
          ? 0
          : roll < 0.32
            ? Math.max(1, Math.floor(reorderPoint * (0.25 + random() * 0.7)))
            : Math.floor(reorderPoint * (1.3 + random() * 3.2));
      items.push(
        Object.freeze({
          id: `${category}-${index}`,
          sku: `${PREFIX[category]}-${String(1040 + index * 7).padStart(4, "0")}`,
          name,
          category,
          warehouse: WAREHOUSES[Math.floor(random() * WAREHOUSES.length)] ?? "Rotterdam",
          onHand,
          reorderPoint,
          unitCost,
        }),
      );
    });
  }
  return Object.freeze(items);
}

export const inventory: readonly StockItem[] = createInventory();
