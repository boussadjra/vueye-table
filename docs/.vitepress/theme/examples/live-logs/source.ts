export interface LogEntry {
  readonly id: number;
  readonly level: "info" | "warn";
  readonly message: string;
}

/** Application transport code: cancellation also removes the timer and listener. */
export function pause(signal: AbortSignal, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new Error("Loading stopped"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

function record(text: string): LogEntry {
  const value: unknown = JSON.parse(text);
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    !Number.isSafeInteger(value.id) ||
    !("level" in value) ||
    (value.level !== "info" && value.level !== "warn") ||
    !("message" in value) ||
    typeof value.message !== "string"
  )
    throw new Error("Invalid log record");
  return { id: value.id as number, level: value.level, message: value.message };
}

/** NDJSON framing belongs to the application, including UTF-8 boundaries and size limits. */
export async function* parseNdjson(
  chunks: AsyncIterable<Uint8Array>,
  signal: AbortSignal,
): AsyncIterable<LogEntry> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  for await (const chunk of chunks) {
    if (signal.aborted) return;
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      if (newline > 65_536) throw new Error("Log line exceeds 65,536 UTF-16 code units");
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield record(line);
      newline = buffer.indexOf("\n");
    }
    if (buffer.length > 65_536) throw new Error("Log line exceeds 65,536 UTF-16 code units");
  }
  if (signal.aborted) return;
  buffer += decoder.decode();
  if (buffer.trim()) yield record(buffer.trim());
}

export async function* simulatedLogs(signal: AbortSignal): AsyncIterable<Uint8Array> {
  const encoder = new TextEncoder();
  for (let id = 0; id < 80; id++) {
    // A delayed local byte stream makes cancellation observable without a remote service.
    // eslint-disable-next-line no-await-in-loop
    await pause(signal, 80);
    const bytes = encoder.encode(
      JSON.stringify({
        id,
        level: id % 9 === 0 ? "warn" : "info",
        message: `Sample worker ${(id % 4) + 1}: job ${id + 1} received — queued`,
      }) + "\n",
    );
    yield bytes.slice(0, 19);
    yield bytes.slice(19);
  }
}
