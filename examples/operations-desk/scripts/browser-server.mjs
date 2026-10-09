import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// This runner owns its fresh temporary database; the operator's database is never opened.
const directory = await mkdtemp(join(tmpdir(), "vueye-browser-"));
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "4312",
    OPERATIONS_DB: join(directory, "operations.sqlite"),
  },
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.kill(signal));
server.once("error", async (error) => {
  console.error(error);
  await rm(directory, { recursive: true, force: true });
  process.exitCode = 1;
});
server.once("exit", async (code) => {
  await rm(directory, { recursive: true, force: true });
  process.exitCode = code ?? 0;
});
