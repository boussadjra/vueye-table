import { VtGrid, VtTable } from "@vueye-table/styled";
import { useDataTable } from "@vueye-table/vue";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { mountWithTable } from "../helpers";

const data = Array.from({ length: 1000 }, (_, id) => ({ id, name: `Name ${id}` }));
const columns = [{ id: "name" as const }];
describe("styled virtual surfaces", () => {
  it.each([VtTable, VtGrid])(
    "uses an opt-in fixed viewport and keeps theme and sticky header",
    async (Component) => {
      const { wrapper, table } = mountWithTable({ data, columns, paginate: false }, (binding) =>
        h(Component, {
          table: binding,
          virtual: true,
          height: "320px",
          theme: "dark",
          rowHeight: 32,
          overscan: 0,
        }),
      );
      expect(wrapper.get(".vt-surface").attributes("data-virtual")).toBe("");
      expect(wrapper.get(".vt-surface").attributes("data-sticky-header")).toBe("");
      expect(wrapper.get(".vt-surface").attributes("data-vt-theme")).toBe("dark");
      const scroll = wrapper.get(".vt-scroll").element as HTMLElement;
      expect(scroll.style.height).toBe("320px");
      Object.defineProperty(scroll, "clientHeight", { value: 96 });
      scroll.dispatchEvent(new Event("scroll"));
      await nextTick();
      expect(wrapper.findAll("tbody [data-virtual-row]")).toHaveLength(3);
      table().search("nothing");
      await nextTick();
      expect(wrapper.find(".vt-empty").exists()).toBe(Component === VtTable);
      wrapper.unmount();
    },
  );
  it("retains byte-identical non-virtual SSR markup", async () => {
    await Promise.all(
      [VtTable, VtGrid].map(async (Component) => {
        const render = (virtual?: false) =>
          renderToString(
            createSSRApp(
              defineComponent({
                setup() {
                  const table = useDataTable({ data: data.slice(0, 3), columns });
                  return () => h(Component, { table, ...(virtual === false ? { virtual } : {}) });
                },
              }),
            ),
          );
        expect(await render(false)).toBe(await render());
      }),
    );
  });
});
