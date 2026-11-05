import packageMetadata from "../../packages/vueye-table/package.json" with { type: "json" };

const { version } = packageMetadata;

/** Release information shared by the docs navigation and landing page. */
export const docsRelease = {
  version,
  label: `v${version}`,
  installCommand: `pnpm add vueye-table@${version}`,
  nuxtInstallCommand: `pnpm add @vueye-table/nuxt@${version}`,
  notice: `${version} is a release candidate for final application validation. Documented APIs are frozen for this phase. Review the 3.0 contract before adopting it.`,
  contractLink: "/guide/beta",
} as const;
