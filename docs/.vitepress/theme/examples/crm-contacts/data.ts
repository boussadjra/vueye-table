/*
 * Sample data for the CRM contacts example. Everything is generated from a seeded PRNG and a fixed
 * reference date, so the server render and the browser render show the same contacts.
 */

export type Stage = "lead" | "qualified" | "proposal" | "customer" | "churned";

export interface Owner {
  readonly id: string;
  readonly name: string;
  readonly first: string;
}

export interface Company {
  readonly name: string;
  readonly domain: string;
  /** Two colors for the logo square. */
  readonly colors: readonly [string, string];
}

export interface Contact {
  readonly id: string;
  readonly name: string;
  readonly company: string;
  readonly role: string;
  readonly email: string;
  readonly phone: string;
  readonly owner: string;
  readonly stage: Stage;
  readonly tags: readonly string[];
  /** A calendar day, `YYYY-MM-DD`. */
  readonly lastContacted: string;
  readonly dealValue: number;
  readonly favorite: boolean;
}

/** "Today" for the example. Relative times are measured from here, never from the clock. */
export const REFERENCE_DAY = "2026-09-30";
const REFERENCE_TIME = Date.UTC(2026, 8, 30);
const DAY = 86_400_000;

export const OWNERS: readonly Owner[] = [
  { id: "maya", name: "Maya Chen", first: "Maya" },
  { id: "theo", name: "Theo Laurent", first: "Theo" },
  { id: "aisha", name: "Aisha Karim", first: "Aisha" },
  { id: "jonas", name: "Jonas Berg", first: "Jonas" },
  { id: "priya", name: "Priya Nair", first: "Priya" },
];

const ownerById = new Map(OWNERS.map((owner) => [owner.id, owner]));

export function ownerName(id: string): string {
  return ownerById.get(id)?.name ?? id;
}

export const STAGES: readonly { readonly id: Stage; readonly label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "customer", label: "Customer" },
  { id: "churned", label: "Churned" },
];

const stageLabels = new Map(STAGES.map((stage) => [stage.id, stage.label]));

export function stageLabel(stage: Stage): string {
  return stageLabels.get(stage) ?? stage;
}

export const TAGS: readonly string[] = [
  "Decision maker",
  "Champion",
  "Enterprise",
  "Warm intro",
  "Renewal",
  "Trial",
  "EMEA",
  "Americas",
];

export const COMPANIES: readonly Company[] = [
  { name: "Northwind Labs", domain: "northwind.io", colors: ["#0c93df", "#3ec5ff"] },
  { name: "Halcyon", domain: "halcyon.com", colors: ["#a02de6", "#d27bff"] },
  { name: "Brightline", domain: "brightline.co", colors: ["#e1583a", "#f5a04e"] },
  { name: "Quillstone", domain: "quillstone.app", colors: ["#1f9d74", "#54d4a4"] },
  { name: "Meridian Health", domain: "meridian.health", colors: ["#c9117f", "#f25ab1"] },
  { name: "Kestrel Freight", domain: "kestrel.co", colors: ["#3a4bd8", "#7e8cff"] },
  { name: "Orchard & Pine", domain: "orchardpine.com", colors: ["#5f8f1f", "#a3cc4c"] },
  { name: "Lumen Grid", domain: "lumengrid.energy", colors: ["#d18a00", "#f7c948"] },
  { name: "Arcadia Bank", domain: "arcadia.bank", colors: ["#14213d", "#4b5d8f"] },
  { name: "Solace", domain: "solace.ai", colors: ["#7a3cf0", "#0c93df"] },
  { name: "Fathom Maritime", domain: "fathom.sea", colors: ["#006d8f", "#26b1c9"] },
  { name: "Vellum Press", domain: "vellum.pub", colors: ["#8a4b2a", "#d08a5c"] },
  { name: "Tidewater", domain: "tidewater.io", colors: ["#0b7a8a", "#43c0b1"] },
  { name: "Ember Robotics", domain: "ember.bot", colors: ["#c2410c", "#e1583a"] },
  { name: "Parallax Studio", domain: "parallax.studio", colors: ["#b0127a", "#8a24c9"] },
  { name: "Cobalt Systems", domain: "cobalt.dev", colors: ["#1e40af", "#0c93df"] },
];

const companyByName = new Map(COMPANIES.map((company) => [company.name, company]));

export function companyOf(name: string): Company | undefined {
  return companyByName.get(name);
}

const FIRST_NAMES = [
  "Olivia",
  "Liam",
  "Sofia",
  "Mateo",
  "Amara",
  "Noah",
  "Yuki",
  "Elena",
  "Kwame",
  "Isla",
  "Rafael",
  "Hana",
  "Lucas",
  "Zara",
  "Felix",
  "Nadia",
  "Oscar",
  "Leila",
  "Emil",
  "Chloe",
  "Arjun",
  "Mila",
  "Tomas",
  "Ines",
  "Diego",
  "Freya",
  "Samir",
  "Ruth",
  "Hugo",
  "Anya",
];

const LAST_NAMES = [
  "Andersson",
  "Okafor",
  "Moreau",
  "Tanaka",
  "Silva",
  "Novak",
  "Haddad",
  "Fischer",
  "Kowalski",
  "Rossi",
  "Mensah",
  "Ivanova",
  "Lindqvist",
  "Park",
  "Duarte",
  "O'Brien",
  "Schmidt",
  "Ahmed",
  "Vargas",
  "Nakamura",
  "Weber",
  "Costa",
  "Bauer",
  "Kim",
];

const ROLES = [
  "Head of Operations",
  "VP Engineering",
  "Chief Revenue Officer",
  "Product Manager",
  "Procurement Lead",
  "CTO",
  "Director of Finance",
  "Head of Growth",
  "IT Manager",
  "Founder & CEO",
  "Data Platform Lead",
  "Customer Success Director",
];

/** Mulberry32: a tiny seeded generator, so the sample never changes between renders. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("'", "")
    .replaceAll(/[^a-z]+/gu, ".");
}

const STAGE_WEIGHTS: readonly [Stage, number][] = [
  ["lead", 0.3],
  ["qualified", 0.22],
  ["proposal", 0.16],
  ["customer", 0.24],
  ["churned", 0.08],
];

function pickStage(random: () => number): Stage {
  let roll = random();
  for (const [stage, weight] of STAGE_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) {
      return stage;
    }
  }
  return "lead";
}

function dayBefore(days: number): string {
  return new Date(REFERENCE_TIME - days * DAY).toISOString().slice(0, 10);
}

export function makeContacts(count = 120): Contact[] {
  const random = createRandom(20_260_930);
  const used = new Set<string>();
  const contacts: Contact[] = [];
  for (let index = 0; contacts.length < count && index < count * 4; index += 1) {
    const first = pick(random, FIRST_NAMES);
    const last = pick(random, LAST_NAMES);
    const name = `${first} ${last}`;
    if (used.has(name)) {
      continue;
    }
    used.add(name);
    const company = pick(random, COMPANIES);
    const stage = pickStage(random);
    const tags = TAGS.filter(() => random() < 0.22).slice(0, 3);
    const spread = random();
    const daysAgo =
      stage === "churned"
        ? 60 + Math.floor(random() * 200)
        : spread < 0.4
          ? 1 + Math.floor(random() * 12)
          : spread < 0.8
            ? 7 + Math.floor(random() * 40)
            : 47 + Math.floor(random() * 160);
    const base = stage === "lead" ? 4 : stage === "churned" ? 8 : 12;
    const dealValue = Math.round((base + random() * random() * 180) * 5) * 100;
    contacts.push({
      id: `c-${String(contacts.length + 1).padStart(3, "0")}`,
      name,
      company: company.name,
      role: pick(random, ROLES),
      email: `${slug(first)}.${slug(last)}@${company.domain}`,
      phone: `+1 (${200 + Math.floor(random() * 700)}) 555-${String(Math.floor(random() * 10_000)).padStart(4, "0")}`,
      owner: pick(random, OWNERS).id,
      stage,
      tags,
      lastContacted: dayBefore(daysAgo),
      dealValue,
      favorite: random() < 0.14,
    });
  }
  return contacts;
}

/** Days between a `YYYY-MM-DD` day and the reference day. */
export function daysSince(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Math.round((REFERENCE_TIME - Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1)) / DAY);
}

/** "Today", "Yesterday", "5 days ago", "3 weeks ago", "4 months ago". */
export function relativeDay(day: string): string {
  const days = daysSince(day);
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 14) {
    return `${days} days ago`;
  }
  if (days < 60) {
    return `${Math.round(days / 7)} weeks ago`;
  }
  if (days < 365) {
    return `${Math.round(days / 30)} months ago`;
  }
  return `${Math.round(days / 365)} yr ago`;
}

/** How fresh a relationship is, for the dot beside "last contacted". */
export function recency(day: string): "fresh" | "warm" | "stale" {
  const days = daysSince(day);
  return days <= 7 ? "fresh" : days <= 30 ? "warm" : "stale";
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(value: number): string {
  return currency.format(value);
}

export function formatCompactMoney(value: number): string {
  return compactCurrency.format(value);
}

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(day: string): string {
  return monthDay.format(new Date(`${day}T00:00:00Z`));
}

export function initials(name: string): string {
  return name
    .split(/\s+/u)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const GRADIENTS: readonly (readonly [string, string])[] = [
  ["#b04cf0", "#d7208f"],
  ["#d7208f", "#ef6a45"],
  ["#ef6a45", "#f59b4e"],
  ["#0c93df", "#7a3cf0"],
  ["#1f9d74", "#0c93df"],
  ["#8a24c9", "#0c93df"],
  ["#c2410c", "#c9117f"],
  ["#0b7a8a", "#54d4a4"],
];

/** A stable gradient for a name. */
export function avatarGradient(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (Math.imul(hash, 31) + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length] as readonly [string, string];
  return `linear-gradient(135deg, ${from}, ${to})`;
}
