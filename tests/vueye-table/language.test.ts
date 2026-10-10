import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h, nextTick } from "vue";
import {
  VueyeGrid,
  VueyeTable,
  VueyeTablePlugin,
  defineColumns,
  type HeaderSlotProps,
  type TableMessages,
} from "vueye-table";

import { people, type Person } from "../fixtures";

const columns = defineColumns<Person>([
  { id: "name.first", header: "First name" },
  { id: "age", align: "end" },
  { id: "city" },
]);

const french: Partial<TableMessages> = {
  searchPlaceholder: "Rechercher…",
  columns: "Colonnes",
  rowsPerPage: "Lignes par page",
  noMatchingRows: "Aucune ligne ne correspond",
  previousPage: "Page précédente",
  rangeStatus: ({ start, end, total }) => `${start.text}–${end.text} sur ${total.text}`,
};

describe("a table's language", () => {
  it("speaks the host's words and writes numbers in its locale", async () => {
    const data = Array.from({ length: 1500 }, (_, index) => ({ id: index, n: index }));
    const wrapper = mount(VueyeTable, {
      props: { data, columns: [{ id: "n" }], locale: "fr", messages: french },
    });
    expect(wrapper.get(".vt-search input").attributes("placeholder")).toBe("Rechercher…");
    expect(wrapper.get(".vt-menu summary").text()).toBe("Colonnes");
    expect(wrapper.get(".vt-page-size span").text()).toBe("Lignes par page");
    expect(wrapper.get(".vt-status").text()).toBe("1–5 sur 1 500");
    expect(wrapper.get('[aria-label="Page précédente"]').element.tagName).toBe("BUTTON");
    await wrapper.get(".vt-search input").setValue("zzz");
    expect(wrapper.get(".vt-empty").text()).toBe("Aucune ligne ne correspond");
  });

  it("takes the application's language from the plugin, a table's own words over it", () => {
    const wrapper = mount(VueyeTable, {
      props: { data: people, columns, messages: { columns: "Spalten" } },
      global: { plugins: [[VueyeTablePlugin, { locale: "fr", messages: french }]] },
    });
    expect(wrapper.get(".vt-menu summary").text()).toBe("Spalten");
    expect(wrapper.get(".vt-page-size span").text()).toBe("Lignes par page");
    expect(wrapper.get(".vt-status").text()).toBe("1–5 sur 7");
  });

  it("re-renders in new words when the host changes them", async () => {
    const wrapper = mount(VueyeTable, { props: { data: people, columns } });
    expect(wrapper.get(".vt-menu summary").text()).toBe("Columns");
    await wrapper.setProps({ messages: { columns: "الأعمدة" } });
    expect(wrapper.get(".vt-menu summary").text()).toBe("الأعمدة");
  });

  it("names the grid and its buttons in the host's words", () => {
    const wrapper = mount(VueyeGrid, {
      props: {
        data: people,
        columns,
        messages: { spreadsheet: "Tableur", undo: "Annuler", exportCsv: "Exporter" },
      },
    });
    expect(wrapper.get("table").attributes("aria-label")).toBe("Tableur");
    const buttons = wrapper.findAll(".vt-toolbar button").map((button) => button.text());
    expect(buttons).toContain("Annuler");
    expect(buttons).toContain("Exporter");
  });

  it("searches without accents or Arabic letter shapes", async () => {
    const data = [
      { id: 1, name: "أحمد" },
      { id: 2, name: "Bénali" },
    ];
    const wrapper = mount(VueyeTable, { props: { data, columns: [{ id: "name" }] } });
    await wrapper.get(".vt-search input").setValue("احمد");
    expect(wrapper.findAll("tbody tr").map((row) => row.text())).toEqual(["أحمد"]);
    await wrapper.get(".vt-search input").setValue("benali");
    expect(wrapper.findAll("tbody tr").map((row) => row.text())).toEqual(["Bénali"]);
  });
});

describe("a custom header", () => {
  it("keeps click-to-sort and receives the sort", async () => {
    const seen: (string | undefined)[] = [];
    const wrapper = mount(VueyeTable, {
      props: { data: people, columns },
      slots: {
        "header.age": (props: HeaderSlotProps) => {
          seen.push(props.sort?.direction);
          return h("em", `Years (${props.column.id})`);
        },
      },
    });
    const button = wrapper.get('th[data-column="age"] button');
    expect(button.find("em").text()).toBe("Years (age)");
    expect(button.find(".vt-sort-indicator").exists()).toBe(true);
    await button.trigger("click");
    expect(wrapper.get('th[data-column="age"]').attributes("aria-sort")).toBe("ascending");
    expect(seen.at(-1)).toBe("asc");
  });

  it("can sort from inside the slot", async () => {
    const wrapper = mount(VueyeTable, {
      props: { data: people, columns },
      slots: {
        "header.city": ({ toggleSort }: HeaderSlotProps) =>
          h(
            "span",
            { class: "custom", onClick: (event: Event) => (event.stopPropagation(), toggleSort()) },
            "City",
          ),
      },
    });
    await wrapper.get(".custom").trigger("click");
    await nextTick();
    expect(wrapper.get('th[data-column="city"]').attributes("aria-sort")).toBe("ascending");
  });
});

describe("theme", () => {
  it("marks a surface whose colors the host supplies", () => {
    const wrapper = mount(VueyeTable, { props: { data: people, columns, theme: "inherit" } });
    expect(wrapper.get(".vt-surface").attributes("data-vt-theme")).toBe("inherit");
  });
});

describe("right to left", () => {
  it("moves the grid cursor the way the reader sees", async () => {
    const active = async (dir: "ltr" | "rtl", keys: readonly string[]) => {
      const wrapper = mount(
        { render: () => h("div", { dir }, [h(VueyeGrid, { data: people, columns })]) },
        { attachTo: document.body },
      );
      const grid = wrapper.get("[role=grid]");
      // One key after the other, each handled before the next.
      await keys.reduce<Promise<unknown>>(
        (previous, key) => previous.then(() => grid.trigger("keydown", { key })),
        Promise.resolve(),
      );
      const cell = grid.attributes("aria-activedescendant");
      wrapper.unmount();
      return cell;
    };
    // Down to the first row, then one step toward the reader's next column.
    expect(await active("ltr", ["ArrowDown", "ArrowRight"])).toMatch(/-c1$/u);
    expect(await active("rtl", ["ArrowDown", "ArrowLeft"])).toMatch(/-c1$/u);
    expect(await active("rtl", ["ArrowDown", "ArrowLeft", "ArrowRight"])).toMatch(/-c0$/u);
  });
});
