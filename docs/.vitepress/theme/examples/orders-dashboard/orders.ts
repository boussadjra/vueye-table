/* Deterministic sample orders for the orders dashboard: a seeded generator, no clock, no randomness. */

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "refunded";

export interface LineItem {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
}

export interface Order {
  readonly id: string;
  readonly customer: { readonly name: string; readonly email: string };
  readonly status: OrderStatus;
  /** The day the order was placed, as `YYYY-MM-DD`. */
  readonly date: string;
  readonly channel: "Online store" | "Mobile app" | "Retail";
  readonly items: readonly LineItem[];
  readonly shipping: number;
  readonly total: number;
}

export const STATUSES: readonly { readonly id: OrderStatus; readonly label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "refunded", label: "Refunded" },
];

/** Every relative date on the page is measured from this day, so server and client agree. */
export const TODAY = "2026-09-30";

const products: readonly (readonly [string, string, number])[] = [
  ["KB-075", "Low-profile keyboard", 129],
  ["MS-210", "Wireless mouse", 49],
  ["DK-400", "Standing desk frame", 389],
  ["LM-118", "Desk lamp, brass", 84],
  ["CH-900", "Ergonomic chair", 549],
  ["MN-270", '27" 4K monitor', 429],
  ["HB-007", "USB-C hub, 7 ports", 59],
  ["HP-310", "Noise-cancelling headphones", 249],
  ["CB-020", "Braided cable set", 24],
  ["MT-050", "Felt desk mat", 39],
  ["WC-100", "1080p webcam", 89],
  ["ST-015", "Laptop stand", 69],
];

const firsts = [
  "Amara",
  "Bruno",
  "Chiara",
  "Dmitri",
  "Elif",
  "Farah",
  "Gustav",
  "Hana",
  "Idris",
  "Jonas",
  "Kaia",
  "Leandro",
  "Mei",
  "Nadia",
  "Omar",
  "Priya",
  "Quentin",
  "Rosa",
  "Soren",
  "Tariq",
  "Uma",
  "Viktor",
  "Wen",
  "Yara",
  "Zeno",
];
const lasts = [
  "Okafor",
  "Lindqvist",
  "Moreau",
  "Tanaka",
  "Haddad",
  "Novak",
  "Castillo",
  "Weber",
  "Rahman",
  "Kowalski",
  "Ferreira",
  "Brennan",
  "Adeyemi",
  "Nakamura",
  "Rossi",
  "Sato",
  "Varga",
  "Duarte",
];
const domains = ["fastmail.com", "proton.me", "gmail.com", "outlook.com", "hey.com", "icloud.com"];
const channels: readonly Order["channel"][] = [
  "Online store",
  "Online store",
  "Mobile app",
  "Retail",
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

/** `YYYY-MM-DD` of the day `offset` days before {@link TODAY}. */
export function dayBefore(offset: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) - offset * DAY).toISOString().slice(0, 10);
}

/** Whole days between an order day and {@link TODAY}. */
export function daysAgo(date: string): number {
  return Math.round((Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY);
}

function statusFor(age: number, roll: number): OrderStatus {
  if (roll < 0.07) {
    return "refunded";
  }
  if (age <= 2) {
    return roll < 0.55 ? "pending" : "paid";
  }
  if (age <= 6) {
    return roll < 0.2 ? "pending" : roll < 0.6 ? "paid" : "shipped";
  }
  if (age <= 14) {
    return roll < 0.3 ? "paid" : roll < 0.65 ? "shipped" : "delivered";
  }
  return roll < 0.1 ? "shipped" : "delivered";
}

export function makeOrders(count: number): Order[] {
  const random = mulberry32(20260930);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const orders: Order[] = [];
  for (let index = 0; index < count; index += 1) {
    // Newer orders are denser, like a shop that is growing.
    const age = Math.floor(Math.pow(random(), 1.35) * 90);
    const first = pick(firsts);
    const last = pick(lasts);
    const lineCount = 1 + Math.floor(Math.pow(random(), 2) * 4);
    const used = new Set<string>();
    const items: LineItem[] = [];
    for (let line = 0; line < lineCount; line += 1) {
      const [sku, name, price] = pick(products);
      if (used.has(sku)) {
        continue;
      }
      used.add(sku);
      items.push({ sku, name, price, quantity: random() < 0.8 ? 1 : 2 + Math.floor(random() * 2) });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 150 ? 0 : 9.5;
    orders.push({
      id: "",
      customer: {
        name: `${first} ${last}`,
        email: `${first}.${last}@${pick(domains)}`.toLowerCase(),
      },
      status: statusFor(age, random()),
      date: dayBefore(age),
      channel: pick(channels),
      items,
      shipping,
      total: Math.round((subtotal + shipping) * 100) / 100,
    });
  }
  // Number the orders by day, oldest first, as a shop would.
  return orders
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((order, index) => ({ ...order, id: `#${String(10_318 + index)}` }))
    .reverse();
}

export function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(value: number, whole = false): string {
  return (whole ? compactCurrency : currency).format(value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `"Sep 12, 2026"`, spelled out by hand so it never depends on the runtime's locale. */
export function shortDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export function relativeDay(date: string): string {
  const days = daysAgo(date);
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 35) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** One of six brand gradients, chosen by name so a customer keeps their color. */
export function avatarTone(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 6;
}
