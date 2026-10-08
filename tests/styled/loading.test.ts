import { VtTable, VtStatus, VtLoadMore } from "@vueye-table/styled";
import { describe, expect, it } from "vitest";
import { h } from "vue";

import { mountWithTable } from "../helpers";
import { deferred, frames } from "../streaming-helpers";

describe("styled source feedback", () => {
  it("shows a loading error instead of no matches when the source fails before any rows", async () => {
    const frame = frames();
    const { wrapper } = mountWithTable(
      {
        columns: [{ id: "id" }],
        scheduleFrame: frame.schedule,
        source: () => {
          throw new Error("Offline");
        },
      },
      (binding) => [h(VtTable, { table: binding }), h(VtLoadMore)],
    );
    await frame.flush();
    expect(wrapper.get(".vt-empty").text()).toBe("Could not load rows.");
    expect(wrapper.get("button.vt-button").text()).toBe("Retry loading");
    wrapper.unmount();
  });
  it("shows the initial loading state and a styled retry control while retaining received rows", async () => {
    const gate = deferred<void>();
    const frame = frames();
    let tries = 0;
    const { wrapper, table } = mountWithTable(
      {
        columns: [{ id: "id" }],
        scheduleFrame: frame.schedule,
        source: () => {
          tries++;
          return (async function* () {
            await gate.promise;
            yield [{ id: 1 }];
            if (tries === 1) throw new Error("Disconnected");
          })();
        },
      },
      (binding) => [h(VtTable, { table: binding }), h(VtStatus), h(VtLoadMore)],
    );
    expect(wrapper.get(".vt-empty").text()).toBe("Loading rows…");
    gate.resolve();
    await frame.flush();
    expect(wrapper.get(".vt-status").text()).toContain("Loaded 1 row");
    expect(table().rows).toHaveLength(1);
    expect(wrapper.get("button.vt-button").text()).toBe("Retry loading");
    await wrapper.get("button.vt-button").trigger("click");
    await frame.flush();
    expect(tries).toBe(2);
    expect(table().loadState).toBe("done");
    expect(wrapper.find("button.vt-button").exists()).toBe(false);
    wrapper.unmount();
  });
});
