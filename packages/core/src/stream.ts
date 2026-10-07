import { issue, type TableIssue } from "./issues";

export type LoadState = "idle" | "loading" | "streaming" | "done" | "error" | "aborted";
/** Structural cancellation, compatible with the caller's native signal. */
export interface StreamSignal {
  readonly aborted: boolean;
  addEventListener?(
    type: "abort",
    listener: () => void,
    options?: { readonly once?: boolean },
  ): void;
  removeEventListener?(type: "abort", listener: () => void): void;
}
export interface StreamOptions {
  readonly signal?: StreamSignal | undefined;
  readonly batchSize?: number | undefined;
  readonly expectedRowCount?: number | undefined;
  readonly mode?: "append" | "upsert" | undefined;
}
export interface DataIngestionResult {
  readonly status: "applied" | "partial" | "rejected" | "unchanged";
  readonly appended: number;
  readonly replaced: number;
  readonly removed: number;
  readonly issues: readonly TableIssue[];
}
export interface StreamResult {
  readonly status: "done" | "error" | "aborted";
  readonly receivedRowCount: number;
  readonly issues: readonly TableIssue[];
}
interface StreamHost<TRow> {
  ingest(rows: readonly TRow[], mode: "append" | "upsert"): DataIngestionResult;
  update(
    state: LoadState,
    expected: number | undefined,
    problems: readonly TableIssue[],
    notify: boolean,
  ): void;
}
export function createStream<TRow>(host: StreamHost<TRow>): {
  run(
    source: AsyncIterable<readonly TRow[] | TRow>,
    options?: StreamOptions,
  ): Promise<StreamResult>;
  cancel(): void;
} {
  let active: { cancel(): void } | undefined;
  return {
    cancel() {
      active?.cancel();
      active = undefined;
    },
    async run(source, options = {}) {
      active?.cancel();
      const problems: TableIssue[] = [];
      const requested = options.batchSize ?? 1000;
      const batchSize = Number.isSafeInteger(requested) && requested > 0 ? requested : 1000;
      if (batchSize !== requested)
        problems.push(
          issue(
            "invalid_stream_option",
            "batchSize must be a positive safe integer; 1,000 is used.",
          ),
        );
      const requestedCount = options.expectedRowCount;
      const expected =
        requestedCount === undefined ||
        (Number.isSafeInteger(requestedCount) && requestedCount >= 0)
          ? requestedCount
          : undefined;
      if (expected !== requestedCount)
        problems.push(
          issue(
            "invalid_stream_option",
            "expectedRowCount must be a non-negative safe integer; it is unknown instead.",
          ),
        );
      let cancelled = false;
      let wake: () => void = () => undefined;
      const cancellation = new Promise<undefined>((resolve) => {
        wake = () => resolve(undefined);
      });
      const cancel = (): void => {
        cancelled = true;
        wake();
      };
      const run = { cancel };
      active = run;
      const signal = options.signal;
      signal?.addEventListener?.("abort", cancel, { once: true });
      if (signal?.aborted) run.cancel();
      let receivedRowCount = 0;
      let status: StreamResult["status"] = "done";
      let iterator: AsyncIterator<readonly TRow[] | TRow> | undefined;
      host.update(cancelled ? "aborted" : "loading", expected, problems, true);
      try {
        if (!cancelled) iterator = source[Symbol.asyncIterator]();
        while (true) {
          if (cancelled || !iterator) break;
          // oxlint-disable-next-line no-await-in-loop -- Preserve source order and backpressure.
          const next = await Promise.race([iterator.next(), cancellation]);
          if (!next || cancelled || signal?.aborted) {
            run.cancel();
            break;
          }
          if (next.done) break;
          const rows: readonly TRow[] = Array.isArray(next.value)
            ? (next.value as readonly TRow[])
            : [next.value as TRow];
          for (let start = 0; start < rows.length; start += batchSize) {
            // Yield between bounded batches; a caller can cancel or supersede this run.
            // oxlint-disable-next-line no-await-in-loop -- Allow cancellation between ordered batches.
            await Promise.resolve();
            if (cancelled || signal?.aborted) {
              run.cancel();
              break;
            }
            host.update("streaming", expected, problems, false);
            const result = host.ingest(
              rows.slice(start, start + batchSize),
              options.mode ?? "append",
            );
            receivedRowCount += result.appended + result.replaced;
            problems.push(...result.issues);
          }
        }
      } catch (error) {
        status = "error";
        problems.push(
          issue("stream_error", error instanceof Error ? error.message : String(error)),
        );
      } finally {
        signal?.removeEventListener?.("abort", cancel);
        if (cancelled) status = "aborted";
        if (active === run) {
          active = undefined;
          host.update(status, expected, problems, true);
        }
        // Do not wait on return(): an uncooperative iterator may be blocked in next().
        if (status !== "done" && iterator?.return)
          void Promise.resolve()
            .then(() => iterator!.return!())
            .catch(() => undefined);
      }
      return Object.freeze({ status, receivedRowCount, issues: Object.freeze([...problems]) });
    },
  };
}
