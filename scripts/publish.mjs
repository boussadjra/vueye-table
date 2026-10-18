#!/usr/bin/env node
/**
 * Publish vueye-table's fixed package group one package at a time, in dependency order.
 *
 * A run is resumable: a package that already exists at the planned version is
 * skipped, so rerunning after a registry failure only retries unfinished work.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { publishablePackages, repositoryRoot } from "./packages.mjs";
import { executePublishPlan } from "./publish-plan.mjs";
import { releaseTagsFor } from "./release-tags.mjs";
import { parseVersion } from "./semver.mjs";

const registry = "https://registry.npmjs.org";

function usage(message) {
  if (message) console.error(`\nError: ${message}`);
  console.error(`
Usage: pnpm publish:packages [options]

Publishes each package in the fixed vueye-table group only when its exact
version is not already present on npm, then synchronizes its dist-tags.

Beta releases update both "beta" and "latest", including on a rerun when
the version is already published. Until a stable release of the current
major exists, alpha publishes under "latest". Once one is on the registry,
other prereleases publish under their own id (alpha, rc).
Older majors (vueye-table 1.x and 2.x) do not count.

Options:
  --tag <tag>      Update only this dist-tag (overrides the policy above)
  --otp <code>     npm one-time password, when required by the npm account
  --dry-run        Print the registry-backed plan and publish nothing
  --help           Show this message
`);
  process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
  const options = { dryRun: false, otp: undefined, tag: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") usage();
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--tag") {
      options.tag = argv[index + 1];
      index += 1;
      if (!options.tag) usage("--tag needs a value");
    } else if (argument.startsWith("--tag=")) {
      options.tag = argument.slice("--tag=".length);
      if (!options.tag) usage("--tag needs a value");
    } else if (argument === "--otp") {
      options.otp = argv[index + 1];
      index += 1;
      if (!options.otp) usage("--otp needs a value");
    } else if (argument.startsWith("--otp=")) {
      options.otp = argument.slice("--otp=".length);
      if (!options.otp) usage("--otp needs a value");
    } else {
      usage(`unknown option "${argument}"`);
    }
  }

  return options;
}

function readManifests() {
  const manifests = publishablePackages.map((directory) => {
    const path = join(repositoryRoot, "packages", directory, "package.json");
    const json = JSON.parse(readFileSync(path, "utf8"));
    return { directory, name: json.name, version: json.version };
  });

  const invalid = manifests.filter(({ version }) => !parseVersion(version));
  if (invalid.length > 0) {
    throw new Error(
      `invalid package versions: ${invalid.map(({ name, version }) => `${name}@${version}`).join(", ")}`,
    );
  }

  const versions = [...new Set(manifests.map(({ version }) => version))];
  if (versions.length !== 1) {
    throw new Error(
      `packages are not in lockstep: ${versions.join(", ")}. Run pnpm version:set first.`,
    );
  }
  return manifests;
}

async function publishedPackage(name) {
  const response = await fetch(`${registry}/${encodeURIComponent(name)}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (response.status === 404) return { published: new Set(), distTags: {} };
  if (!response.ok) throw new Error(`${name}: registry returned ${response.status}`);
  const body = await response.json();
  return {
    published: new Set(Object.keys(body.versions ?? {})),
    distTags: body["dist-tags"] ?? {},
  };
}

function publish(name, { otp, tag }) {
  const command = join(repositoryRoot, "node_modules", "pnpm", "bin", "pnpm.cjs");
  const publishArguments = [
    "--filter",
    name,
    "publish",
    "--access",
    "public",
    "--tag",
    tag,
    "--no-git-checks",
  ];
  if (otp) publishArguments.push("--otp", otp);
  return (
    spawnSync(process.execPath, [command, ...publishArguments], {
      cwd: repositoryRoot,
      stdio: "inherit",
    }).status === 0
  );
}

function updateTag(name, version, tag, { otp }) {
  const args = ["dist-tag", "add", `${name}@${version}`, tag, "--registry", registry];
  if (otp) args.push("--otp", otp);
  // Launch npm's CLI directly on Windows, where .cmd shims require a shell.
  const command =
    process.platform === "win32"
      ? join(
          dirname(createRequire(process.execPath).resolve("npm/package.json")),
          "bin",
          "npm-cli.js",
        )
      : undefined;
  const result = command
    ? spawnSync(process.execPath, [command, ...args], { cwd: repositoryRoot, stdio: "inherit" })
    : spawnSync("npm", args, { cwd: repositoryRoot, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  return result.status === 0;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifests = readManifests();
  const [{ version }] = manifests;

  const plan = await Promise.all(
    manifests.map(async (manifest) => {
      const metadata = await publishedPackage(manifest.name);
      return { ...manifest, ...metadata, alreadyPublished: metadata.published.has(version) };
    }),
  );
  // The group shares one version and one tag, decided by every package's history together.
  const tags = releaseTagsFor(
    version,
    plan.map(({ published }) => published),
    options.tag,
  );

  console.log(`Publishing ${version} with tags: ${tags.join(", ")}\n`);

  const width = Math.max(...plan.map(({ name }) => name.length));
  for (const { alreadyPublished, name, distTags } of plan) {
    const updates = tags.filter((tag) => distTags[tag] !== version);
    console.log(
      `  ${name.padEnd(width)}  ${alreadyPublished ? "already published" : "to publish"}; ${updates.length > 0 ? `update tags: ${updates.join(", ")}` : "tags current"}`,
    );
  }

  const pending = plan.filter(({ alreadyPublished }) => !alreadyPublished);
  const { publishedCount, taggedCount } = await executePublishPlan(
    plan,
    { ...options, version, tags, allowTagDowngrade: options.tag !== undefined },
    { publish, updateTag },
  );
  if (options.dryRun) {
    console.log(
      `\n--dry-run: ${pending.length} package${pending.length === 1 ? "" : "s"} would be published; listed tags would be synchronized.`,
    );
    return;
  }

  console.log(
    `\nPublished ${publishedCount} package${publishedCount === 1 ? "" : "s"} at ${version}; updated ${taggedCount} dist-tag${taggedCount === 1 ? "" : "s"}.`,
  );
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
});
