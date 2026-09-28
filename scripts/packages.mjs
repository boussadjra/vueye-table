import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * One description of the package graph, shared by every repository check and by the repository
 * tests, so they cannot drift apart.
 */

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const packagesRoot = join(repositoryRoot, "packages");

export const githubRepository = "boussadjra/vueye-table";
export const githubRepositoryUrl = `https://github.com/${githubRepository}`;

/** Directory name to published package name. */
export const packageNames = {
  core: "@vueye-table/core",
  vue: "@vueye-table/vue",
  headless: "@vueye-table/headless",
  styled: "@vueye-table/styled",
  "vueye-table": "vueye-table",
  nuxt: "@vueye-table/nuxt",
};

/**
 * Directory name to the internal packages it may depend on. Each layer reaches only the layers
 * beneath it:
 *
 *   core ← vue ← headless ← styled ← vueye-table ← nuxt
 */
export const allowedInternalDependencies = {
  core: [],
  vue: ["@vueye-table/core"],
  headless: ["@vueye-table/core", "@vueye-table/vue"],
  styled: ["@vueye-table/core", "@vueye-table/vue", "@vueye-table/headless"],
  "vueye-table": [
    "@vueye-table/core",
    "@vueye-table/vue",
    "@vueye-table/headless",
    "@vueye-table/styled",
  ],
  nuxt: ["vueye-table"],
};

/** Every publishable package directory, in dependency order. */
export const publishablePackages = Object.keys(allowedInternalDependencies);

const frameworkImports = [/^vue(?:\/|$)/u, /^@vue\//u, /^nuxt(?:\/|$)/u, /^@nuxt\//u];

/** Import specifiers each package must never reach for, in source or in built output. */
export const forbiddenImports = {
  core: [/^node:/u, ...frameworkImports],
  vue: [/^node:/u, /^nuxt(?:\/|$)/u, /^@nuxt\//u],
  headless: [/^node:/u, /^nuxt(?:\/|$)/u, /^@nuxt\//u],
  styled: [/^node:/u, /^nuxt(?:\/|$)/u, /^@nuxt\//u],
  "vueye-table": [/^node:/u, /^nuxt(?:\/|$)/u, /^@nuxt\//u],
  nuxt: [/^node:/u],
};

/**
 * Runtime globals each package must never read. Every package renders on a server as well as in
 * a browser, so none may reach for browser globals; components use template refs and event
 * objects instead. The checker matches whole words, comments included.
 */
const browserGlobals = [
  "document",
  "history",
  "location",
  "navigator",
  "window",
  "localStorage",
  "sessionStorage",
];
export const forbiddenGlobals = {
  core: [...browserGlobals, "process"],
  vue: [...browserGlobals, "process"],
  headless: [...browserGlobals, "process"],
  styled: [...browserGlobals, "process"],
  "vueye-table": [...browserGlobals, "process"],
  nuxt: browserGlobals,
};

/** Frameworks vueye-table will not depend on. */
export const forbiddenFrameworks = [
  "react",
  "react-dom",
  "svelte",
  "@angular/core",
  "solid-js",
  "jquery",
];

/** Manifest fields every published package must define. */
export const requiredManifestFields = [
  "name",
  "version",
  "description",
  "type",
  "exports",
  "types",
  "files",
  "sideEffects",
  "engines",
  "repository",
  "homepage",
  "bugs",
  "license",
  "keywords",
  "publishConfig",
];

async function readManifest(directory) {
  return JSON.parse(await readFile(join(packagesRoot, directory, "package.json"), "utf8"));
}

/** Read every publishable package manifest, keyed by directory name. */
export async function readManifests() {
  const entries = await Promise.all(
    publishablePackages.map(async (directory) => [directory, await readManifest(directory)]),
  );
  return Object.fromEntries(entries);
}

/** Every private workspace directory, grouped by workspace root, plus the docs site. */
export async function readPrivateWorkspaces() {
  const docs = {
    group: ".",
    directory: "docs",
    manifest: JSON.parse(await readFile(join(repositoryRoot, "docs", "package.json"), "utf8")),
  };
  const groups = await Promise.all(
    ["apps", "tooling"].map(async (group) => {
      const entries = await readdir(join(repositoryRoot, group), { withFileTypes: true });
      return Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => ({
            group,
            directory: entry.name,
            manifest: JSON.parse(
              await readFile(join(repositoryRoot, group, entry.name, "package.json"), "utf8"),
            ),
          })),
      );
    }),
  );
  return [...groups.flat(), docs];
}

/** Collect every bare and relative specifier a JavaScript or TypeScript source imports. */
export function collectImportSpecifiers(source) {
  const specifiers = [];
  const pattern =
    /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|@import\s+["']([^"']+)["']/gu;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

/** The package a specifier belongs to, or `undefined` for a relative one. */
export function toPackageName(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return undefined;
  }
  if (specifier.startsWith("node:")) {
    return specifier;
  }
  const segments = specifier.split("/");
  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

/** Report a formatted failure list and set the process exit code. */
export function report(title, failures) {
  if (failures.length > 0) {
    console.error(`${title} failed:\n`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return false;
  }
  console.log(`${title} passed.`);
  return true;
}
