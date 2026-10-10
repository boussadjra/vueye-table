import {
  defaultTableMessages,
  formatCount,
  resolveTableMessages,
  type Count,
  type TableMessages,
} from "@vueye-table/core";
import { inject, provide, type InjectionKey } from "vue";

import type { DataGridBinding } from "./use-data-grid";
import type { DataTableBinding } from "./use-data-table";

const tableKey: InjectionKey<DataTableBinding<unknown>> = Symbol("vueye-table");
const gridKey: InjectionKey<DataGridBinding<unknown>> = Symbol("vueye-table-grid");

/** Make a table available to every component below the current one. */
export function provideDataTable<TRow>(table: DataTableBinding<TRow>): void {
  provide(tableKey, table as DataTableBinding<unknown>);
}

/**
 * Read the table provided by an ancestor. Throws when there is none, naming the component that
 * provides one, rather than rendering an empty table.
 */
export function injectDataTable<TRow = unknown>(
  consumer = "This component",
): DataTableBinding<TRow> {
  const table = inject(tableKey, undefined);
  if (!table) {
    throw new Error(
      `${consumer} needs a table. Render it inside <DataTableRoot :table="table">, or call provideDataTable(useDataTable(...)) in an ancestor.`,
    );
  }
  return table as DataTableBinding<TRow>;
}

export function provideDataGrid<TRow>(grid: DataGridBinding<TRow>): void {
  provide(gridKey, grid as DataGridBinding<unknown>);
}

/** Read the grid provided by an ancestor, or `undefined` outside a grid. */
export function injectDataGrid<TRow = unknown>(): DataGridBinding<TRow> | undefined {
  return inject(gridKey, undefined) as DataGridBinding<TRow> | undefined;
}

/** What a host says about language: the locale numbers and text follow, and its own words. */
export interface TableLocaleOptions {
  readonly locale?: string | undefined;
  readonly messages?: Partial<TableMessages> | undefined;
}

/** The language every component below a provider speaks. */
export interface TableLocale {
  readonly locale: string | undefined;
  readonly messages: TableMessages;
  /** A number written in the locale, with its value kept for plural choices. */
  readonly count: (value: number) => Count;
}

/**
 * A getter, so a component reads the current language each time it renders: a host that changes
 * its locale or words re-renders the table in them.
 */
export const tableLocaleKey: InjectionKey<() => TableLocaleOptions> = Symbol("vueye-table-locale");

const defaultLocale: TableLocale = {
  locale: undefined,
  messages: defaultTableMessages,
  count: (value) => formatCount(value),
};

/**
 * Give every component below the current one a locale and words. An ancestor's options are kept
 * for whatever these leave out, so an application-wide language (`VueyeTablePlugin`) and a
 * table's own words combine. Returns the combined language, for the providing component itself.
 */
export function provideTableLocale(options: () => TableLocaleOptions): () => TableLocale {
  const parent = inject(tableLocaleKey, undefined);
  const merged = (): TableLocaleOptions => {
    const own = options();
    const inherited = parent?.() ?? {};
    return {
      locale: own.locale ?? inherited.locale,
      messages: { ...inherited.messages, ...definedMessages(own.messages) },
    };
  };
  provide(tableLocaleKey, merged);
  return resolveLocale(merged);
}

function definedMessages(
  messages: Partial<TableMessages> | undefined,
): Partial<TableMessages> | undefined {
  if (!messages) return undefined;
  const defined: Partial<TableMessages> = Object.fromEntries(
    Object.entries(messages).filter(([, value]) => value !== undefined),
  );
  return defined;
}

/**
 * The language provided by an ancestor, or English with the runtime's number format. Call it in
 * `setup` and read the result while rendering.
 */
export function useTableLocale(): () => TableLocale {
  const source = inject(tableLocaleKey, undefined);
  return source ? resolveLocale(source) : () => defaultLocale;
}

/** Resolve options to words and a number format, again only when they change. */
function resolveLocale(source: () => TableLocaleOptions): () => TableLocale {
  let cached: { options: TableLocaleOptions; resolved: TableLocale } | undefined;
  return () => {
    const options = source();
    if (
      cached &&
      cached.options.locale === options.locale &&
      shallowEqual(cached.options.messages, options.messages)
    )
      return cached.resolved;
    const format = new Intl.NumberFormat(options.locale);
    const resolved: TableLocale = {
      locale: options.locale,
      messages: resolveTableMessages(options.messages),
      count: (value) => ({ value, text: format.format(value) }),
    };
    cached = { options, resolved };
    return resolved;
  };
}

function shallowEqual(
  left: Partial<TableMessages> | undefined,
  right: Partial<TableMessages> | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  const keys = Object.keys(left) as (keyof TableMessages)[];
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}
