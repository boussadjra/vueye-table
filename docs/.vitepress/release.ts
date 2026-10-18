import packageMetadata from "../../packages/vueye-table/package.json" with { type: "json" };

const { version } = packageMetadata;

/** Release information shared by the docs navigation and landing page. */
export const docsRelease = {
  version,
  label: `v${version}`,
  installCommand: `pnpm add vueye-table@${version}`,
  nuxtInstallCommand: `pnpm add @vueye-table/nuxt@${version}`,
  notice: `${version} is a prerelease for application feedback. Documented APIs stay stable through the beta. Review the beta contract before adopting it.`,
  contractLink: "/guide/beta",
} as const;
