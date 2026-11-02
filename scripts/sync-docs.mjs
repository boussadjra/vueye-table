#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { repositoryRoot } from "./packages.mjs";

export const releaseDocs = [
  "README.md",
  "CLAUDE.md",
  "RELEASING.md",
  "docs/guide/beta.md",
  "docs/guide/getting-started.md",
  "docs/guide/nuxt.md",
];

/** Update only marked current-release copy; historical records and consumer pins stay intact. */
export function syncDocs({ root = repositoryRoot, check = false } = {}) {
  const { version } = JSON.parse(
    readFileSync(join(root, "packages/vueye-table/package.json"), "utf8"),
  );
  const updates = new Map();
  for (const file of releaseDocs) {
    const original = readFileSync(join(root, file), "utf8");
    const block = /<!-- current-release:start -->[\s\S]*?<!-- current-release:end -->/gu;
    if (!block.test(original)) throw new Error(`${file}: missing current-release markers`);
    updates.set(
      file,
      original.replace(block, (text) =>
        text.replace(
          /\d+\.\d+\.\d+(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?/giu,
          version,
        ),
      ),
    );
  }
  // npm renders this README from the package directory, so repository-relative links need full URLs.
  updates.set(
    "packages/vueye-table/README.md",
    updates
      .get("README.md")
      .replaceAll("](./", "](https://github.com/boussadjra/vueye-table/blob/main/"),
  );
  const changed = [...updates].filter(
    ([file, text]) => readFileSync(join(root, file), "utf8") !== text,
  );
  if (!check) for (const [file, text] of changed) writeFileSync(join(root, file), text);
  return changed.map(([file]) => file);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const changed = syncDocs({ check });
  if (check && changed.length) {
    console.error(
      `Release documentation is out of sync: ${changed.join(", ")}. Run pnpm docs:sync.`,
    );
    process.exitCode = 1;
  } else
    console.log(
      check
        ? "Release documentation is in sync."
        : `Updated ${changed.length} documentation files.`,
    );
}
