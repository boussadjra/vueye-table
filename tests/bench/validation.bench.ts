import { createTable } from "@vueye-table/core";
import { bench, describe } from "vitest";

const count = 10_000;
const table = createTable({
  data: Array.from({ length: count }, (_, id) => ({ id, quantity: 1 })),
  paginate: false,
  historyLimit: 0,
  columns: [
    {
      id: "quantity",
      editable: true,
      editor: { kind: "number", min: 1, max: 99 },
      validate: (value) => (value > 0 ? true : "Use a positive quantity."),
    },
  ],
});
table.getSnapshot();
const input = ["2", "3"].map((value) => Array.from({ length: count }, () => value).join("\n"));
let alternate = false;
describe("synchronous validation", () => {
  bench(
    "10,000-cell paste including snapshot",
    () => {
      alternate = !alternate;
      table.paste({ row: 0, column: 0 }, input[alternate ? 1 : 0]!);
      table.getSnapshot();
      table.markSaved();
    },
    { time: 1_000, warmupTime: 300, iterations: 5, warmupIterations: 2 },
  );
});
