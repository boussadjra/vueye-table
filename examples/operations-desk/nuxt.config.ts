import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  modules: ["@vueye-table/nuxt"],
  vueyeTable: { layers: true },
  devtools: { enabled: false },
  css: ["~/assets/operations.css"],
  typescript: {
    strict: true,
    typeCheck: true,
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } },
  },
  nitro: {
    preset: "node-server",
    externals: {
      external: ["node:sqlite"],
      // Nuxt 4.6.0 Windows renderer workaround: nuxt/nuxt#36467.
      inline: [/[/\\]node_modules[/\\]nuxt[/\\]dist[/\\]/u],
    },
  },
  app: { head: { title: "Operations desk · vueye-table acceptance" } },
});
