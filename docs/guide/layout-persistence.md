# Share column layout with QueryWeave

`columnSizing` and `columnPinning` are serializable state. Bind them to a QueryWeave model to
restore widths and ordered logical pin regions from a URL, including Back/Forward navigation.
Keep the table and URL on one update path: table events write the model, and model values feed
the controlled props. External updates do not echo another table change.

This example runs in a browser-only Vue app:

```sh
pnpm add @queryweave/core @queryweave/browser @queryweave/vue vueye-table vue
```

QueryWeave currently exposes JSON through `param.custom`, rather than a built-in `param.json`.
The codecs below validate column ids, finite width bounds, duplicate pins and cross-side conflicts.
Invalid URL values produce QueryWeave issues and recover to the declared field defaults. The
table still owns its own layout validation and reports recovered input through `TableIssue`.

## Define the model

Save this as `table-layout.ts`. Its allowed ids and bounds match the table below.

```ts
import { createQueryIssue, defineQueryModel, failValue, okValue, param } from "@queryweave/core";
import type { ColumnPinning, TableState } from "vueye-table";

type ColumnSizing = TableState["columnSizing"];
export interface SavedLayout {
  readonly columnSizing: ColumnSizing;
  readonly columnPinning: ColumnPinning;
}
const bounds = { id: [88, 180], customer: [180, 420], total: [100, 220] } as const;
const ids = Object.keys(bounds);
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sizing(value: unknown): value is ColumnSizing {
  return (
    record(value) &&
    Object.entries(value).every(([id, width]) => {
      if (!Object.hasOwn(bounds, id) || typeof width !== "number" || !Number.isFinite(width))
        return false;
      const [min, max] = bounds[id as keyof typeof bounds];
      return width >= min && width <= max;
    })
  );
}
function pinning(value: unknown): value is ColumnPinning {
  if (
    !record(value) ||
    Object.keys(value).length !== 2 ||
    !Array.isArray(value["start"]) ||
    !Array.isArray(value["end"])
  )
    return false;
  const all: unknown[] = [...value["start"], ...value["end"]];
  return (
    all.every((id) => typeof id === "string" && ids.includes(id)) &&
    new Set(all).size === all.length
  );
}
function jsonField<T extends object>(accept: (value: unknown) => value is T) {
  return param.custom<T>({
    decode: (input, context) => {
      try {
        const value: unknown = JSON.parse(input[0] ?? "");
        if (accept(value)) return okValue(value);
      } catch {
        /* Report malformed JSON through the same field issue. */
      }
      return failValue([
        createQueryIssue({
          key: context.key,
          code: "invalid",
          message: "Invalid saved column layout.",
        }),
      ]);
    },
    encode: (value) => [JSON.stringify(value)],
  });
}
export const tableLayout = defineQueryModel({
  columnSizing: jsonField(sizing).default({}),
  columnPinning: jsonField(pinning).default({ start: ["id"], end: ["total"] }),
});
```

## Bind the table

```vue
<script setup lang="ts">
import { ref } from "vue";
import { createBrowserAdapter } from "@queryweave/browser";
import { provideQueryAdapter, useQueryModel } from "@queryweave/vue";
import { VueyeTable, defineColumns } from "vueye-table";
import "vueye-table/style.css";
import { tableLayout, type SavedLayout } from "./table-layout";

provideQueryAdapter(createBrowserAdapter());
const layout = useQueryModel(tableLayout);
const notice = ref("");
const data = [{ id: "ORD-1", customer: "Amara", total: 129 }];
const columns = defineColumns<(typeof data)[number]>([
  { id: "id", width: 96, minWidth: 88, maxWidth: 180 },
  { id: "customer", width: 240, minWidth: 180, maxWidth: 420 },
  { id: "total", width: 130, minWidth: 100, maxWidth: 220, align: "end" },
]);
async function save(patch: Partial<SavedLayout>): Promise<void> {
  try {
    await layout.update(patch, { navigation: "replace" });
    notice.value = "";
  } catch {
    notice.value = "Couldn't save this layout in the URL. Try the change again.";
  }
}
</script>

<template>
  <VueyeTable
    :data="data"
    :columns="columns"
    resizable-columns
    :column-sizing="layout.values.columnSizing"
    :column-pinning="layout.values.columnPinning"
    @update:column-sizing="save({ columnSizing: $event })"
    @update:column-pinning="save({ columnPinning: $event })"
  />
  <p v-if="notice" role="status">{{ notice }}</p>
  <ul v-if="layout.issues.length" aria-label="Saved layout issues">
    <li v-for="issue in layout.issues" :key="issue.key">{{ issue.message }}</li>
  </ul>
</template>
```

Resize handles commit once on release. `navigation: "replace"` avoids a history entry for each
layout adjustment; use `"push"` when each saved view should be a navigation step. Pin arrays retain
their order. Renaming/removing columns requires updating the schema and deciding how older links
should recover. Large or private layouts are better saved by id on your server than embedded in a URL.

For SSR or Nuxt, supply the framework's request-scoped QueryWeave adapter instead of constructing
a browser adapter during server setup. See QueryWeave's
[custom codecs](https://github.com/boussadjra/queryweave/blob/main/apps/docs/src/content/docs/concepts/parameters.mdx#custom)
and [Vue bindings](https://github.com/boussadjra/queryweave/blob/main/apps/docs/src/content/docs/frameworks/vue.mdx).
The [orders dashboard](/examples/orders-dashboard) demonstrates the table's controlled layout
models with local state; it does not write to the browser URL.
