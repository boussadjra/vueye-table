import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { VueyeGrid, VueyeTable, type LoadMoreResult } from "vueye-table";

import { deferred, settleSource } from "../streaming-helpers";

type Row = { id: number; name: string };
const columns = [{ id: "name" }];
async function paint() {
  await settleSource();
  await vi.advanceTimersByTimeAsync(20);
  await nextTick();
}
afterEach(() => vi.useRealTimers());

describe("full component sources", () => {
  it("distinguishes a zero-row source error from an empty search result", async () => {
    vi.useFakeTimers();
    const wrapper = mount(VueyeTable, {
      props: {
        columns,
        source: () => {
          throw new Error("Offline");
        },
        searchable: false,
        columnToggle: false,
      },
    });
    await paint();
    expect(wrapper.get(".vt-empty").text()).toBe("Could not load rows.");
    expect(wrapper.get("button.vt-button").text()).toBe("Retry loading");
    wrapper.unmount();
  });
  it.each([VueyeTable, VueyeGrid])(
    "server renders initial rows without opening the source, then hydrates and loads",
    async (Component) => {
      vi.useFakeTimers();
      let calls = 0;
      const source = () => {
        calls++;
        return (async function* () {
          yield { id: 2, name: "Received" };
        })();
      };
      const Host = {
        render: () =>
          h(Component, {
            data: [{ id: 1, name: "Initial" }],
            columns,
            source,
            searchable: false,
            toolbar: false,
            columnToggle: false,
          }),
      };
      const html = await renderToString(createSSRApp(Host));
      expect(calls).toBe(0);
      expect(html).toContain("Initial");
      expect(html).toContain("Loaded 1 row…");
      const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.append(container);
      const app = createSSRApp(Host);
      app.mount(container);
      await paint();
      expect(calls).toBe(1);
      expect(container.querySelector(".vt-status")?.textContent).toBe(
        "Loaded 2 rows. All rows loaded.",
      );
      expect(warnings.mock.calls.flat().join(" ")).not.toContain("Hydration");
      expect(container.querySelector("table")?.getAttribute("aria-busy")).toBeNull();
      app.unmount();
      container.remove();
    },
  );

  it.each([VueyeTable, VueyeGrid])(
    "loads cursor pages without an initial data prop, exposes live status and retry",
    async (Component) => {
      vi.useFakeTimers();
      let calls = 0;
      const page = deferred<LoadMoreResult<Row>>();
      const loadMore = async () => {
        calls++;
        if (calls === 1) return { rows: [{ id: 1, name: "First" }], cursor: "next", done: false };
        if (calls === 2) return page.promise;
        return { rows: [{ id: 2, name: "Second" }], done: true };
      };
      const wrapper = mount(Component, {
        props: { columns, loadMore, searchable: false, columnToggle: false, toolbar: false },
      });
      await paint();
      expect(wrapper.find(".vt-pagination").exists()).toBe(false);
      expect(wrapper.get(".vt-status").attributes("aria-live")).toBe("polite");
      await wrapper.get("button.vt-button").trigger("click");
      await paint();
      expect(wrapper.get("[data-load-sentinel]").text()).toBe("Loading more rows…");
      expect(wrapper.get("table").attributes("aria-busy")).toBe("true");
      page.reject(new Error("Offline"));
      await paint();
      expect(wrapper.get("button.vt-button").text()).toBe("Retry loading");
      expect(wrapper.text()).toContain("First");
      await wrapper.get("button.vt-button").trigger("click");
      await paint();
      expect(wrapper.get(".vt-status").text()).toBe("Loaded 2 rows. All rows loaded.");
      expect(wrapper.find("button.vt-button").exists()).toBe(false);
      wrapper.unmount();
    },
  );
});
