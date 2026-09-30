#!/usr/bin/env node
/**
 * Publish vueye-table's fixed package group one package at a time, in dependency order.
 *
 * A run is resumable: a package that already exists at the planned version is
 * skipped, so rerunning after a registry failure only retries unfinished work.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { publishablePackages, repositoryRoot } from "./packages.mjs";
import { parseVersion } from "./semver.mjs";

const registry = "https://registry.npmjs.org";

function usage(message) {
  if (message) console.error(`\nError: ${message}`);
  console.error(`
Usage: pnpm publish:packages [options]

Publishes each package in the fixed vueye-table group only when its exact
version is not already present on npm.

Until a stable release of the current major exists, every publish goes to
"latest" so a bare install resolves the newest prerelease. Once one is on the
registry, a prerelease is published under its own id (alpha, beta, rc).
Older majors (vueye-table 1.x and 2.x) do not count.

Options:
  --tag <tag>      Dist-tag to publish under (overrides the policy above)
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

/**
 * A prerelease keeps its own dist-tag only once a stable release of the same major exists to hold
 * `latest`. Before that, `latest` must follow the newest prerelease, or a bare install resolves an
 * older one. The unscoped `vueye-table` carries 1.x and 2.x history, so only the current major
 * counts: a 1.x stable must not send 3.0.0 prereleases to a tag nobody installs.
 */
function tagFor(version, publishedSets) {
  const { major, prerelease } = parseVersion(version);
  if (typeof prerelease?.[0] !== "string") {
    return "latest";
  }
  const stableExists = publishedSets.some((published) =>
    [...published].some((name) => {
      const parsed = parseVersion(name);
      return parsed !== undefined && parsed.prerelease === undefined && parsed.major === major;
    }),
  );
  return stableExists ? prerelease[0] : "latest";
}

async function publishedVersions(name) {
  const response = await fetch(`${registry}/${encodeURIComponent(name)}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (response.status === 404) return new Set();
  if (!response.ok) throw new Error(`${name}: registry returned ${response.status}`);
  const body = await response.json();
  return new Set(Object.keys(body.versions ?? {}));
}

function publish(name, { otp, tag }) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
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
    spawnSync(command, publishArguments, { cwd: repositoryRoot, stdio: "inherit" }).status === 0
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifests = readManifests();
  const [{ version }] = manifests;

  const plan = await Promise.all(
    manifests.map(async (manifest) => {
      const published = await publishedVersions(manifest.name);
      return { ...manifest, published, alreadyPublished: published.has(version) };
    }),
  );
  // The group shares one version and one tag, decided by every package's history together.
  const tag =
    options.tag ??
    tagFor(
      version,
      plan.map(({ published }) => published),
    );

  console.log(`Publishing ${version} under the "${tag}" tag\n`);

  const width = Math.max(...plan.map(({ name }) => name.length));
  for (const { alreadyPublished, name } of plan) {
    console.log(
      `  ${name.padEnd(width)}  ${alreadyPublished ? "already published" : "to publish"}`,
    );
  }

  const pending = plan.filter(({ alreadyPublished }) => !alreadyPublished);
  if (pending.length === 0) {
    console.log(`\nEvery package is already published at ${version}. Nothing to do.`);
    return;
  }
  if (options.dryRun) {
    console.log(
      `\n--dry-run: ${pending.length} package${pending.length === 1 ? "" : "s"} would be published.`,
    );
    return;
  }

  const failed = [];
  for (const [index, { name }] of pending.entries()) {
    console.log(`\n-- ${name} (${index + 1}/${pending.length}) --`);
    if (!publish(name, { otp: options.otp, tag })) failed.push(name);
  }

  if (failed.length > 0) {
    console.error(
      `\nFailed: ${failed.join(", ")}. Re-run this command to retry only unfinished packages.`,
    );
    process.exit(1);
  }
  console.log(
    `\nPublished ${pending.length} package${pending.length === 1 ? "" : "s"} at ${version}.`,
  );
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
});
