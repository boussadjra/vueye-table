import { describe, expect, it, vi } from "vitest";

import { parseNdjson, pause } from "../../docs/.vitepress/theme/examples/live-logs/source";

async function* bytes(parts: readonly Uint8Array[]): AsyncIterable<Uint8Array> {
  yield* parts;
}
describe("log example transport", () => {
  it("frames CRLF, blank lines, split UTF-8 and a final line without newline", async () => {
    const input = new TextEncoder().encode(
      '\r\n{"id":1,"level":"info","message":"café"}\r\n{"id":2,"level":"warn","message":"done"}',
    );
    const records = [];
    for await (const row of parseNdjson(
      bytes(Array.from(input, (byte) => Uint8Array.of(byte))),
      new AbortController().signal,
    ))
      records.push(row);
    expect(records).toEqual([
      { id: 1, level: "info", message: "café" },
      { id: 2, level: "warn", message: "done" },
    ]);
  });
  it("rejects malformed records and oversized lines rather than yielding unchecked data", async () => {
    for (const text of ['{"id":1,"level":"fatal","message":"bad"}\n', "x".repeat(65_537)]) {
      const iterator = parseNdjson(
        bytes([new TextEncoder().encode(text)]),
        new AbortController().signal,
      )[Symbol.asyncIterator]();
      // eslint-disable-next-line no-await-in-loop
      await expect(iterator.next()).rejects.toThrow(/Invalid log record|Log line exceeds/u);
    }
  });
  it("closes its input iterator on abort and releases delayed work", async () => {
    const controller = new AbortController();
    let closed = false;
    async function* input(): AsyncIterable<Uint8Array> {
      try {
        controller.abort();
        yield Uint8Array.of(10);
      } finally {
        closed = true;
      }
    }
    const iterator = parseNdjson(input(), controller.signal)[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toMatchObject({ done: true });
    expect(closed).toBe(true);
    vi.useFakeTimers();
    const active = new AbortController();
    const pending = pause(active.signal, 500);
    active.abort();
    await expect(pending).rejects.toThrow("Loading stopped");
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
