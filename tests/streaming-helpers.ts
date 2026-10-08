import type { FrameScheduler } from "@vueye-table/vue";
import { nextTick } from "vue";

export function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export async function settleSource(): Promise<void> {
  for (let index = 0; index < 30; index++) {
    // Drain successive iterator continuations, which cannot run concurrently.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
  await nextTick();
}
export function frames(): { schedule: FrameScheduler; flush(): Promise<void> } {
  const pending = new Set<() => void>();
  return {
    schedule(callback) {
      pending.add(callback);
      return () => {
        pending.delete(callback);
      };
    },
    async flush() {
      await settleSource();
      for (const callback of [...pending]) {
        pending.delete(callback);
        callback();
      }
      await settleSource();
    },
  };
}
