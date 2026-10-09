import assert from "node:assert/strict";

import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { VueyeGrid, VueyeTable } from "vueye-table";

const data = [{ id: 1, sku: "SKU-1", quantity: 10 }];
const columns = [
  { id: "sku", header: "SKU" },
  { id: "quantity", header: "Quantity" },
];
const failures = [];
for (const { name, component, props } of [
  {
    name: "grid with row numbers",
    component: VueyeGrid,
    props: { rowNumbers: true, toolbar: false },
  },
  {
    name: "table with selection",
    component: VueyeTable,
    props: { selectable: true, searchable: false, columnToggle: false, pagination: false },
  },
]) {
  const html = await renderToString(
    createSSRApp({ render: () => h(component, { data, columns, ...props }) }),
  );
  const count = Number(html.match(/aria-colcount="(\d+)"/u)?.[1]);
  const header = html.match(/<thead[^>]*>(.*?)<\/thead>/su)?.[1] ?? "";
  const nativeColumns = (header.match(/<th(?:\s|>)/gu) ?? []).length;
  console.info(`${name}: aria-colcount=${count}; header columns=${nativeColumns}`);
  if (count !== nativeColumns) failures.push(name);
}
assert.deepEqual(failures, [], "Utility columns must be included in the accessible column count");
