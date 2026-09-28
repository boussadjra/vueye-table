import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import nuxtModule from "@vueye-table/nuxt";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sources(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("repository", () => {
  it("passes the boundary checker", () => {
    const output = execFileSync("node", ["scripts/check-boundaries.mjs"], { cwd: root });
    expect(String(output)).toContain("Dependency-boundary validation passed.");
  });

  it("keeps the engine free of frameworks", () => {
    const offenders = sources(join(root, "packages/core/src")).filter((file) =>
      /from "(vue|@vue\/|nuxt|node:)/u.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("never depends on React", () => {
    const offenders = readdirSync(join(root, "packages")).filter((directory) =>
      /"react(-dom)?"/u.test(
        readFileSync(join(root, "packages", directory, "package.json"), "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("publishes every package at one version", () => {
    const versions = new Set(
      readdirSync(join(root, "packages")).map(
        (directory) =>
          (
            JSON.parse(readFileSync(join(root, "packages", directory, "package.json"), "utf8")) as {
              version: string;
            }
          ).version,
      ),
    );
    expect(versions.size).toBe(1);
  });

  it("describes the Nuxt module", async () => {
    const meta = await nuxtModule.getMeta?.();
    expect(meta?.configKey).toBe("vueyeTable");
    expect(meta?.name).toBe("@vueye-table/nuxt");
  });
});
