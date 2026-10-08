import { defineConfig, postcssIsolateStyles } from "vitepress";

const description =
  "A Vue framework for data, data tables, and spreadsheets: one engine, with composables, headless and styled components, and a full table on top.";

export default defineConfig({
  title: "vueye-table",
  description: "A Vue framework for data, data tables, and spreadsheets.",
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",
  // Links into the repository (sources, ARCHITECTURE.md) are not pages of this site.
  ignoreDeadLinks: [/^\.\.\/\.\.\//u],
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#09080f" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "vueye-table" }],
    ["meta", { property: "og:description", content: description }],
  ],
  markdown: {
    theme: { light: "github-light", dark: "catppuccin-mocha" },
  },
  vite: {
    css: {
      postcss: {
        // Live demos sit inside .vp-raw, where the document styles for tables and lists stop.
        plugins: [postcssIsolateStyles({ includeFiles: [/vp-doc\.css/u] })],
      },
    },
  },
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Examples", link: "/examples/" },
      { text: "Decisions", link: "/adr/0001-layered-packages" },
      {
        text: "3.0 alpha",
        items: [
          { text: "Upgrading from 2.x", link: "/guide/upgrading-from-2" },
          {
            text: "2.x on the legacy branch",
            link: "https://github.com/boussadjra/vueye-table/tree/legacy",
          },
        ],
      },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Layers", link: "/guide/layers" },
          { text: "Columns", link: "/guide/columns" },
          { text: "State and v-model", link: "/guide/state" },
          { text: "Server-side data", link: "/guide/server-data" },
          { text: "Incremental data and streams", link: "/guide/streaming" },
          { text: "Large datasets and virtualization", link: "/guide/virtualization" },
          { text: "Row expansion", link: "/guide/expansion" },
          { text: "Tree data", link: "/guide/trees" },
          { text: "Editing and spreadsheets", link: "/guide/editing" },
          { text: "Validation and saving", link: "/guide/validation" },
          { text: "Vue row drafts", link: "/guide/row-drafts" },
          { text: "Theming", link: "/guide/theming" },
          { text: "Component reference", link: "/guide/components" },
          { text: "Nuxt", link: "/guide/nuxt" },
          { text: "Upgrading from 2.x", link: "/guide/upgrading-from-2" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "Gallery", link: "/examples/" },
          { text: "Full table", link: "/examples/table" },
          { text: "Spreadsheet", link: "/examples/grid" },
          { text: "Virtual layout", link: "/examples/virtual-layout" },
          { text: "Virtual grid", link: "/examples/virtual-grid" },
          { text: "Virtual components", link: "/examples/virtual-components" },
          { text: "Order details", link: "/examples/row-expansion" },
          { text: "Project files", link: "/examples/tree-data" },
          { text: "Tree and detail components", link: "/examples/hierarchy-components" },
          { text: "Orders dashboard", link: "/examples/orders-dashboard" },
          { text: "CRM contacts", link: "/examples/crm-contacts" },
          { text: "Server-side API", link: "/examples/server-side" },
          { text: "Streaming source (core)", link: "/examples/streaming" },
          { text: "Streaming components (Vue)", link: "/examples/streaming-components" },
          { text: "Row drafts (Vue)", link: "/examples/row-drafts" },
          { text: "Inventory sheet", link: "/examples/inventory" },
          { text: "Financial report", link: "/examples/financial-report" },
        ],
      },
      {
        text: "Decisions",
        items: [
          { text: "0001 Layered packages", link: "/adr/0001-layered-packages" },
          { text: "0002 Engine state and snapshots", link: "/adr/0002-engine-state-and-snapshots" },
          { text: "0003 Editing and spreadsheets", link: "/adr/0003-editing-and-spreadsheets" },
          { text: "0004 Components and theming", link: "/adr/0004-components-and-theming" },
          { text: "0005 Virtualization", link: "/adr/0005-virtualization" },
          {
            text: "0006 Incremental ingestion and streaming",
            link: "/adr/0006-incremental-ingestion-and-streaming",
          },
          { text: "0007 Expansion and detail items", link: "/adr/0007-expansion-and-trees" },
          { text: "0009 Content boundaries", link: "/adr/0009-content-boundaries" },
          { text: "0011 Tree data", link: "/adr/0011-tree-data" },
          {
            text: "0012 Validation and row operations",
            link: "/adr/0012-validation-and-row-operations",
          },
          { text: "0013 Component virtualization", link: "/adr/0013-component-virtualization" },
          { text: "0014 Vue row drafts", link: "/adr/0014-vue-row-drafts-and-editor-metadata" },
          {
            text: "0015 Vue sources and cursor loading",
            link: "/adr/0015-vue-sources-and-cursor-loading",
          },
          { text: "0016 Hierarchy components", link: "/adr/0016-hierarchy-components" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/boussadjra/vueye-table" }],
    search: { provider: "local" },
    footer: { message: "Released under the MIT License. 3.0.0-alpha: the API is provisional." },
  },
});
