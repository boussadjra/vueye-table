import { rm } from "node:fs/promises";
import { join } from "node:path";

await Promise.all(
  ["dist", "coverage", ".turbo"].map((directory) =>
    rm(join(process.cwd(), directory), { force: true, recursive: true }),
  ),
);
