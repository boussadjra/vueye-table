import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// @ts-expect-error The standalone documentation script does not ship declarations.
import { releaseDocs, syncDocs } from "../../scripts/sync-docs.mjs";

const fixtures: string[] = [];
const sample = `<!-- current-release:start -->
Install vueye-table@3.0.0-beta.4; release /tag/v3.0.0-beta.4.
<!-- current-release:end -->
Historical acceptance used 3.0.0-beta.1. See [the guide](./docs/guide/beta.md).
`;
function fixture(version: string): string {
  const root = mkdtempSync(join(tmpdir(), "vueye-docs-sync-"));
  fixtures.push(root);
  const write = (file: string, text: string): void => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  write("packages/vueye-table/package.json", JSON.stringify({ version }));
  write("packages/vueye-table/README.md", "Old alpha README");
  for (const file of releaseDocs as string[]) write(file, sample);
  return root;
}
afterEach(() => {
  for (const root of fixtures.splice(0)) {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith("vueye-docs-sync-")
    )
      throw new Error("Unexpected documentation fixture path");
    rmSync(root, { recursive: true, force: true });
  }
});

describe("release documentation", () => {
  it("matches the current package version and generated npm README", () => {
    expect(syncDocs({ check: true })).toEqual([]);
  });

  it.each(["3.0.0-beta.8", "4.0.0"])(
    "detects drift without writing and synchronizes %s without rewriting history",
    (version) => {
      const root = fixture(version);
      expect(syncDocs({ root, check: true })).toContain("README.md");
      expect(readFileSync(join(root, "README.md"), "utf8")).toBe(sample);
      syncDocs({ root });
      const readme = readFileSync(join(root, "README.md"), "utf8");
      expect(readme).toContain(`vueye-table@${version}; release /tag/v${version}.`);
      expect(readme).toContain("Historical acceptance used 3.0.0-beta.1");
      expect(readme).toContain("](./docs/guide/beta.md)");
      const npmReadme = readFileSync(join(root, "packages/vueye-table/README.md"), "utf8");
      expect(npmReadme).toContain(`vueye-table@${version}`);
      expect(npmReadme).toContain(
        "](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/beta.md)",
      );
      expect(syncDocs({ root, check: true })).toEqual([]);
    },
  );

  it("refuses missing release markers before changing any files", () => {
    const root = fixture("3.0.0-beta.8");
    writeFileSync(join(root, "CLAUDE.md"), "Unmarked historical version 3.0.0-beta.1");
    expect(() => syncDocs({ root })).toThrow("missing current-release markers");
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe(sample);
  });
});
