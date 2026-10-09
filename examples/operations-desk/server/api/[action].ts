import { Readable } from "node:stream";
import { setTimeout } from "node:timers/promises";

import {
  createError,
  defineEventHandler,
  getQuery,
  getRouterParam,
  readBody,
  sendStream,
  setHeader,
} from "h3";

import { locationChildren, warehouses } from "../../app/utils/operations.ts";
import { getStore, parseBatch, SaveError } from "../utils/store.ts";

let activeStreams = 0;
export default defineEventHandler(async (event) => {
  const action = getRouterParam(event, "action");
  const query = getQuery(event);
  const text = (key: string, fallback = "") =>
    typeof query[key] === "string" ? query[key] : fallback;
  const delay = Math.min(2_000, Math.max(0, Number(query.delay) || 0));
  if (delay) await setTimeout(delay);
  if (query.fail === "1")
    throw createError({
      statusCode: 503,
      statusMessage: "Injected service outage. Retry the request.",
    });
  try {
    if (action === "orders" && event.method === "GET")
      return getStore().orders(
        text("search"),
        text("sort", "id"),
        query.desc === "1",
        Number(query.cursor ?? 0),
      );
    if (action === "stock" && event.method === "GET") return getStore().stock();
    if (action === "save" && event.method === "POST")
      return getStore().save(parseBatch(await readBody<unknown>(event)));
    if (action === "sku" && event.method === "GET")
      return { available: getStore().skuAvailable(text("sku"), text("id")) };
    if (action === "compete" && event.method === "POST") return getStore().compete("stock-1");
    if (action === "locations" && event.method === "GET")
      return locationChildren(typeof query.parent === "string" ? query.parent : undefined);
    if (action === "health" && event.method === "GET")
      return { activeStreams, orders: getStore().orders().total, stock: getStore().stock().length };
    if (action === "receiving" && event.method === "GET") {
      setHeader(event, "Content-Type", "application/x-ndjson; charset=utf-8");
      setHeader(event, "Cache-Control", "no-store");
      const controller = new AbortController();
      const close = () => controller.abort();
      event.node.res.once("close", close);
      const count = Math.min(10_000, Math.max(1, Number(query.count) || 1_000));
      async function* source() {
        activeStreams++;
        try {
          for (let index = 0; index < count && !controller.signal.aborted; index++) {
            // Network delivery is intentionally sequential and cancellable.
            // eslint-disable-next-line no-await-in-loop
            if (index % 25 === 0) await setTimeout(20, undefined, { signal: controller.signal });
            const line = Buffer.from(
              JSON.stringify({
                id: index + 1,
                reference: `RCV-${index + 1}`,
                warehouse: warehouses[index % 3],
                quantity: (index % 50) + 1,
                message:
                  index % 3 === 0
                    ? "استلام شحنة · Étiquette vérifiée"
                    : "<script>literal warehouse note</script>",
              }) + "\n",
            );
            // Split inside multibyte text as well as JSON: the browser must decode incrementally.
            const multibyte = line.findIndex((byte) => byte >= 128);
            const split = multibyte < 0 ? Math.floor(line.length / 2) : multibyte + 1;
            yield line.subarray(0, split);
            yield line.subarray(split);
          }
        } catch (error) {
          if (!controller.signal.aborted) throw error;
        } finally {
          activeStreams--;
          event.node.res.off("close", close);
        }
      }
      return sendStream(event, Readable.from(source()));
    }
    throw createError({ statusCode: 404, statusMessage: "Unknown operations endpoint." });
  } catch (error) {
    if (error instanceof SaveError)
      throw createError({ statusCode: error.status, statusMessage: error.message });
    throw error;
  }
});
