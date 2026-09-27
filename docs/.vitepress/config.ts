import { defineConfig } from "vitepress";

export default defineConfig({
  title: "vueye-table",
  description: "A Vue framework for data, data tables, and spreadsheets.",
  cleanUrls: true,
  lastUpdated: true,
  // Links into the repository (sources, ARCHITECTURE.md) are not pages of this site.
  ignoreDeadLinks: [/^\.\.\/\.\.\//u],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Examples", link: "/examples/table" },
      { text: "Decisions", link: "/adr/0001-layered-packages" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Layers", link: "/guide/layers" },
          { text: "Nuxt", link: "/guide/nuxt" },
          { text: "Upgrading from 2.x", link: "/guide/upgrading-from-2" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "Full table", link: "/examples/table" },
          { text: "Spreadsheet", link: "/examples/grid" },
        ],
      },
      {
        text: "Decisions",
        items: [
          { text: "0001 Layered packages", link: "/adr/0001-layered-packages" },
          { text: "0002 Engine state and snapshots", link: "/adr/0002-engine-state-and-snapshots" },
          { text: "0003 Editing and spreadsheets", link: "/adr/0003-editing-and-spreadsheets" },
          { text: "0004 Components and theming", link: "/adr/0004-components-and-theming" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/boussadjra/vueye-table" }],
    search: { provider: "local" },
    footer: { message: "Released under the MIT License. 3.0.0-alpha: the API is provisional." },
  },
});
