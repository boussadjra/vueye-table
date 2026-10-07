import { humanize } from "./humanize";
import { getPath, isSafePath, setPath, type DeepKeys, type PathValue } from "./path";

export type ColumnAlign = "start" | "center" | "end";

/** How typed or pasted text becomes a value when a column has no `parse`. */
export type ColumnType = "text" | "number" | "boolean" | "date";

/** A range filter value, inclusive at both ends. Either end may be left open. */
export interface RangeFilter {
  readonly min?: number | string | Date | undefined;
  readonly max?: number | string | Date | undefined;
}

/** Options shared by path columns and computed columns. */
export interface ColumnOptions<TRow, TValue> {
  /** Header text. Defaults to the id made readable: `"createdAt"` becomes `"Created at"`. */
  readonly header?: string | undefined;
  readonly align?: ColumnAlign | undefined;
  /** Width in pixels. */
  readonly width?: number | undefined;
  readonly minWidth?: number | undefined;
  /** Whether a user may sort by this column. Defaults to `true`. */
  readonly sortable?: boolean | undefined;
  /** Whether the free-text search looks at this column. Defaults to `true`. */
  readonly searchable?: boolean | undefined;
  /** Hidden until a user shows it. */
  readonly hidden?: boolean | undefined;
  /**
   * How text becomes a value. Defaults to the type of the cell's current value, or of another
   * row's value when the cell is empty.
   */
  readonly type?: ColumnType | undefined;
  /** Whether cells of this column accept edits. A function decides per row. */
  readonly editable?: boolean | ((row: TRow) => boolean) | undefined;
  /** Order two values; the engine flips the sign for descending sorts. */
  readonly compare?: ((left: TValue, right: TValue) => number) | undefined;
  /** Decide whether a row passes this column's filter value. */
  readonly filter?: ((value: TValue, filterValue: unknown, row: TRow) => boolean) | undefined;
  /** Turn a value into the text a cell shows, searches, copies, and exports. */
  readonly format?: ((value: TValue, row: TRow) => string) | undefined;
  /**
   * Turn typed or pasted text into a value. Throw to reject the input. Defaults to reading the
   * column's `type`.
   */
  readonly parse?: ((input: string, row: TRow) => TValue) | undefined;
  /** Free-form data for renderers. The engine never reads it. */
  readonly meta?: Readonly<Record<string, unknown>> | undefined;
}

/** A column that reads `row[id]`, following dots into nested objects. */
export interface PathColumnDef<TRow, TPath extends string> extends ColumnOptions<
  TRow,
  PathValue<TRow, TPath>
> {
  readonly id: TPath;
  readonly accessor?: undefined;
  readonly setValue?: undefined;
}

/** A column whose value is computed from the row. It is editable only with `setValue`. */
export interface ComputedColumnDef<TRow, TValue = unknown> extends ColumnOptions<TRow, TValue> {
  readonly id: string;
  readonly accessor: (row: TRow) => TValue;
  /** Return a copy of `row` carrying `value`. Without it the column is read-only. */
  readonly setValue?: ((row: TRow, value: TValue) => TRow) | undefined;
}

/**
 * One column definition. A path column is discriminated by its literal id, so `format`,
 * `compare`, and `parse` receive the value type found at that path.
 */
export type ColumnDef<TRow> =
  | {
      [TPath in DeepKeys<TRow>]: PathColumnDef<TRow, TPath>;
    }[DeepKeys<TRow>]
  | ComputedColumnDef<TRow, any>;

/**
 * A column definition for any row type, for props and containers that accept every table.
 */
export type AnyColumnDef = ColumnDef<any>;

/** Declare columns for a row type with full inference, outside a table. */
export function defineColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
): readonly ColumnDef<TRow>[] {
  return Object.freeze([...columns]);
}

/**
 * A column resolved against its defaults. Renderers read these; they never read definitions.
 */
export interface TableColumn<TRow> {
  readonly id: string;
  readonly header: string;
  readonly align: ColumnAlign;
  readonly width: number | undefined;
  readonly minWidth: number | undefined;
  readonly sortable: boolean;
  readonly searchable: boolean;
  readonly initiallyHidden: boolean;
  readonly meta: Readonly<Record<string, unknown>>;
  readonly definition: ColumnDef<TRow>;
  getValue(row: TRow): unknown;
  format(value: unknown, row: TRow): string;
  compare(left: unknown, right: unknown): number;
  matches(value: unknown, filterValue: unknown, row: TRow): boolean;
  isEditable(row: TRow): boolean;
  /**
   * Parse text into a value, or report why it could not be read. `sample` is a value from another
   * row, used to tell the column's type when this cell is empty.
   */
  parse(input: string, row: TRow, sample?: unknown): ParseResult;
  /** Return a copy of `row` carrying `value`, or `undefined` for a read-only column. */
  setValue(row: TRow, value: unknown): TRow | undefined;
}

/** The outcome of reading text into a cell value. */
export type ParseResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string };

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Order any two values: empty last, then numbers, dates, booleans, and text naturally. */
export function compareValues(left: unknown, right: unknown): number {
  const leftEmpty = isEmpty(left);
  const rightEmpty = isEmpty(right);
  if (leftEmpty || rightEmpty) {
    return leftEmpty === rightEmpty ? 0 : leftEmpty ? 1 : -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "bigint" && typeof right === "bigint") {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return collator.compare(formatValue(left), formatValue(right));
}

/**
 * Text for a value: empty for `null` and `undefined`, ISO for dates, comma-joined for arrays, and
 * JSON for other objects. The result never depends on the runtime's locale, so server and client
 * render the same text.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "bigint":
    case "boolean":
      return String(value);
    case "symbol":
      return value.toString();
    default:
      return "";
  }
}

function toComparable(value: unknown): number | string | undefined {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * Read a range bound in the kind of the value it is compared with, so a bound typed into a text
 * box (`"10"`, `"2024-01-31"`) compares with numbers as a number and with dates as a time. An
 * empty or unreadable bound leaves that end of the range open.
 */
function toBound(bound: unknown, value: unknown): number | string | undefined {
  if (isEmpty(bound)) {
    return undefined;
  }
  if (typeof bound === "string" && typeof value === "number") {
    const number = Number(bound.trim());
    return bound.trim() === "" || Number.isNaN(number) ? undefined : number;
  }
  if (typeof bound === "string" && value instanceof Date) {
    return toComparable(new Date(bound));
  }
  if (bound instanceof Date && typeof value === "string") {
    // Compare text dates at their own precision: "2024-01-31" against the bound's day.
    return Number.isNaN(bound.getTime()) ? undefined : bound.toISOString().slice(0, value.length);
  }
  return toComparable(bound);
}

function isRangeFilter(value: unknown): value is RangeFilter {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    ("min" in value || "max" in value)
  );
}

/**
 * The default column filter:
 *
 * - an empty filter value (`undefined`, `null`, `""`, `[]`) lets every row through;
 * - an array keeps rows whose value is one of its items;
 * - `{ min, max }` keeps values inside the inclusive range; a bound given as text is read as a
 *   number or a date when the value is one, and an empty bound leaves that end open;
 * - text keeps rows whose shown text contains it, ignoring case;
 * - anything else keeps rows whose value is identical.
 */
export function matchesFilter(value: unknown, filterValue: unknown, display: string): boolean {
  if (isEmpty(filterValue) || (Array.isArray(filterValue) && filterValue.length === 0)) {
    return true;
  }
  if (Array.isArray(filterValue)) {
    return filterValue.some((item) => Object.is(item, value) || compareValues(item, value) === 0);
  }
  if (isRangeFilter(filterValue)) {
    const min = toBound(filterValue.min, value);
    const max = toBound(filterValue.max, value);
    if (min === undefined && max === undefined) {
      return true;
    }
    const comparable = toComparable(value);
    if (comparable === undefined) {
      return false;
    }
    return (min === undefined || comparable >= min) && (max === undefined || comparable <= max);
  }
  if (typeof filterValue === "string") {
    return display.toLowerCase().includes(filterValue.toLowerCase());
  }
  return Object.is(value, filterValue);
}

const TRUE_WORDS = new Set(["true", "1", "yes", "y", "on"]);
const FALSE_WORDS = new Set(["false", "0", "no", "n", "off"]);

/** The column type a value suggests, or `undefined` for an empty value. */
export function typeOf(value: unknown): ColumnType | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return value instanceof Date ? "date" : "text";
}

/** Read text as a column type. Empty text is `null` for every type but text. */
export function parseAs(input: string, type: ColumnType): ParseResult {
  const text = input.trim();
  if (type === "text") {
    return { ok: true, value: input };
  }
  if (text === "") {
    return { ok: true, value: null };
  }
  if (type === "number") {
    const value = Number(text);
    return Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, message: `"${input}" is not a number` };
  }
  if (type === "boolean") {
    const word = text.toLowerCase();
    if (TRUE_WORDS.has(word)) {
      return { ok: true, value: true };
    }
    if (FALSE_WORDS.has(word)) {
      return { ok: true, value: false };
    }
    return { ok: false, message: `"${input}" is not a yes or no value` };
  }
  const value = new Date(text);
  return Number.isNaN(value.getTime())
    ? { ok: false, message: `"${input}" is not a date` }
    : { ok: true, value };
}

/** Resolve a definition against its defaults. */
export function resolveColumn<TRow>(definition: ColumnDef<TRow>): TableColumn<TRow> {
  // Both branches of the union share these members; the value type is erased at runtime.
  const def = definition as ComputedColumnDef<TRow> | PathColumnDef<TRow, string>;
  const { accessor } = def;
  const safe = isSafePath(def.id);
  const getValue: (row: TRow) => unknown = safe
    ? (accessor ?? ((row) => getPath(row, def.id)))
    : () => undefined;
  const format = def.format ?? ((value: unknown) => formatValue(value));
  const compare = def.compare ?? compareValues;
  const customFilter = def.filter;
  const customParse = def.parse;
  const editable = def.editable ?? false;
  const customSetValue = def.setValue;
  const canWrite = safe && (accessor === undefined || customSetValue !== undefined);

  return Object.freeze({
    id: def.id,
    header: def.header ?? humanize(def.id),
    align: def.align ?? "start",
    width: def.width,
    minWidth: def.minWidth,
    sortable: def.sortable ?? true,
    searchable: def.searchable ?? true,
    initiallyHidden: def.hidden ?? false,
    meta: Object.freeze({ ...def.meta }),
    definition,
    getValue,
    format: (value: unknown, row: TRow): string => format(value as never, row),
    compare: (left: unknown, right: unknown): number => compare(left as never, right as never),
    matches(value: unknown, filterValue: unknown, row: TRow): boolean {
      return customFilter
        ? customFilter(value as never, filterValue, row)
        : matchesFilter(value, filterValue, format(value as never, row));
    },
    isEditable(row: TRow): boolean {
      if (!canWrite) {
        return false;
      }
      return typeof editable === "function" ? editable(row) : editable;
    },
    parse(input: string, row: TRow, sample?: unknown): ParseResult {
      if (customParse) {
        try {
          return { ok: true, value: customParse(input, row) };
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : String(error) };
        }
      }
      return parseAs(input, def.type ?? typeOf(getValue(row)) ?? typeOf(sample) ?? "text");
    },
    setValue(row: TRow, value: unknown): TRow | undefined {
      if (!safe) {
        return undefined;
      }
      if (customSetValue) {
        return customSetValue(row, value);
      }
      return accessor === undefined ? setPath(row, def.id, value) : undefined;
    },
  });
}
