import {
  DataGridRoot,
  DataTableRoot,
  DataTableViewport,
  DataTableLoadMore,
  DataTableStatus,
} from "@vueye-table/headless";
import type { LoadMoreResult } from "@vueye-table/vue";
import { describe, expect, it } from "vitest";
import { h } from "vue";

import { mountWithTable } from "../helpers";
import { deferred, frames, settleSource } from "../streaming-helpers";

type Row = { id: number };
const rows = Array.from({ length: 20 }, (_, id) => ({ id }));

describe("headless loading composition", () => {
  it.each([DataTableRoot, DataGridRoot])(
    "loads near the virtual end, retains selection and scroll, and retries errors",
    async (Root) => {
      const frame = frames();
      const page = deferred<LoadMoreResult<Row>>();
      let calls = 0;
      const { wrapper, table } = mountWithTable<Row>(
        {
          columns: [{ id: "id" }],
          paginate: false,
          endThreshold: 0,
          scheduleFrame: frame.schedule,
          loadMore: async () => {
            calls++;
            if (calls === 1) return { rows, cursor: 20, done: false };
            if (calls === 2) return page.promise;
            return { rows: [{ id: 20 }], done: true };
          },
        },
        (binding) => [
          h(DataTableViewport, { height: "120px" }, () =>
            h(Root, { table: binding, virtual: true, overscan: 0, rowHeight: 40 }),
          ),
          h(DataTableStatus),
          h(DataTableLoadMore),
        ],
      );
      const scroll = wrapper.get("[data-virtual-viewport]").element as HTMLElement;
      Object.defineProperties(scroll, {
        clientHeight: { value: 120 },
        clientWidth: { value: 300 },
      });
      scroll.dispatchEvent(new Event("scroll"));
      await frame.flush();
      expect(calls).toBe(1);
      expect(wrapper.get("[role=status]").attributes("aria-live")).toBe("polite");
      expect(wrapper.get("[role=status]").text()).toBe("Loaded 20 rows.");
      table().select([0]);
      scroll.scrollTop = 680;
      scroll.dispatchEvent(new Event("scroll"));
      await frame.flush();
      expect(calls).toBe(2);
      expect(wrapper.get("[data-load-sentinel]").attributes("aria-hidden")).toBe("true");
      expect(wrapper.get("table").attributes("aria-busy")).toBe("true");
      page.reject(new Error("Offline"));
      await frame.flush();
      expect(calls).toBe(2);
      expect(wrapper.find("[data-load-sentinel]").exists()).toBe(false);
      expect(wrapper.get("[role=status]").text()).toContain("Could not load rows");
      await wrapper
        .findAll("button")
        .find((button) => button.text() === "Retry loading")!
        .trigger("click");
      await frame.flush();
      expect(table().loadedRowCount).toBe(21);
      expect(table().state.selection).toEqual([0]);
      expect(scroll.scrollTop).toBe(680);
      expect(
        wrapper
          .findAll("button")
          .some(
            (button) => button.text() === "Retry loading" || button.text() === "Load more rows",
          ),
      ).toBe(false);
      expect(wrapper.get("[role=status]").text()).toBe("Loaded 21 rows. All rows loaded.");
      wrapper.unmount();
    },
  );

  it("keeps the manual load button mounted and disabled while a page is pending", async () => {
    const frame = frames();
    const page = deferred<LoadMoreResult<Row>>();
    let calls = 0;
    const { wrapper } = mountWithTable<Row>(
      {
        columns: [{ id: "id" }],
        scheduleFrame: frame.schedule,
        loadMore: async () =>
          ++calls === 1 ? { rows: [{ id: 0 }], cursor: 1, done: false } : page.promise,
      },
      () => h(DataTableLoadMore, { label: "Next batch", loadingLabel: "Fetching batch" }),
    );
    await frame.flush();
    const button = wrapper.get("button").element;
    await wrapper.get("button").trigger("click");
    await frame.flush();
    expect(wrapper.get("button").element).toBe(button);
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.get("button").text()).toBe("Fetching batch");
    page.resolve({ rows: [{ id: 1 }], done: true });
    await frame.flush();
    wrapper.unmount();
    await settleSource();
  });
});
