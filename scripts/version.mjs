#!/usr/bin/env node
/**
 * Lockstep semver updates for vueye-table's publishable package group.
 *
 * Usage:
 *   pnpm version:set 3.0.0-alpha.1
 *   pnpm version:set prerelease --preid alpha
 *   pnpm version:set preminor --preid beta
 *   pnpm version:set minor --dry-run
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { publishablePackages, repositoryRoot } from "./packages.mjs";
import { compareVersions, incrementVersion, parseVersion } from "./semver.mjs";

const releaseTypes = new Set([
  "major",
  "minor",
  "patch",
  "premajor",
  "preminor",
  "prepatch",
  "prerelease",
]);

function usage(message) {
  if (message) console.error(`\nError: ${message}`);
  console.error(`
Usage: pnpm version:set <version|release-type> [options]

  <version>        Exact semver version, for example 3.0.0-alpha.1
  <release-type>   ${[...releaseTypes].join(", ")}

Options:
  --preid <id>     Prerelease identifier for pre* releases, for example alpha
  --dry-run        Show the lockstep change without writing manifests
  --help           Show this message

Examples:
  pnpm version:set 3.0.0-alpha.1
  pnpm version:set prerelease --preid alpha
  pnpm version:set preminor --preid beta
  pnpm version:set minor
`);
  process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
  const options = { dryRun: false, preid: undefined, target: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") usage();
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--preid") {
      options.preid = argv[index + 1];
      index += 1;
      if (!options.preid) usage("--preid needs a value");
    } else if (argument.startsWith("--preid=")) {
      options.preid = argument.slice("--preid=".length);
      if (!options.preid) usage("--preid needs a value");
    } else if (argument.startsWith("-")) {
      usage(`unknown option "${argument}"`);
    } else if (options.target === undefined) {
      options.target = argument;
    } else {
      usage(`unexpected argument "${argument}"`);
    }
  }

  if (!options.target) usage("a version or release type is required");
  return options;
}

function readManifest(relativePath) {
  const path = join(repositoryRoot, relativePath);
  const raw = readFileSync(path, "utf8");
  return { json: JSON.parse(raw), path, raw, relativePath };
}

function readPublishableManifests() {
  const manifests = publishablePackages.map((directory) =>
    readManifest(join("packages", directory, "package.json")),
  );
  const missingVersions = manifests.filter(({ json }) => !json.version);
  if (missingVersions.length > 0) {
    throw new Error(
      `missing version fields: ${missingVersions.map(({ relativePath }) => relativePath).join(", ")}`,
    );
  }
  return manifests;
}

function currentVersion(manifests) {
  const invalid = manifests.filter(({ json }) => !parseVersion(json.version));
  if (invalid.length > 0) {
    throw new Error(
      `invalid package versions: ${invalid.map(({ json }) => `${json.name}@${json.version}`).join(", ")}`,
    );
  }

  const versions = [...new Set(manifests.map(({ json }) => json.version))].sort((left, right) =>
    compareVersions(right, left),
  );
  const [highest] = versions;
  if (versions.length > 1) {
    console.warn(`Packages are not in lockstep: ${versions.join(", ")}. Bumping from ${highest}.`);
  }
  return highest;
}

function nextVersion(current, { preid, target }) {
  const exact = parseVersion(target);
  if (exact) {
    if (compareVersions(exact, current) < 0) {
      console.warn(`Setting ${exact.raw}, which is lower than the current ${current}.`);
    }
    return exact.raw;
  }

  if (!releaseTypes.has(target)) {
    usage(`"${target}" is neither a valid version nor a release type`);
  }

  return incrementVersion(current, target, preid);
}

function withVersion(raw, version) {
  const versionField = /^(  "version": ")([^"]*)(")/mu;
  if (!versionField.test(raw)) throw new Error('no top-level "version" field found');
  return raw.replace(versionField, `$1${version}$3`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const packages = readPublishableManifests();
  const current = currentVersion(packages);
  const next = nextVersion(current, options);
  const root = readManifest("package.json");
  const manifests = [...packages, root];

  console.log(`${current} -> ${next}\n`);
  const width = Math.max(...manifests.map(({ json }) => json.name.length));
  for (const { json } of manifests) {
    console.log(`  ${json.name.padEnd(width)}  ${json.version.padStart(16)} -> ${next}`);
  }

  if (options.dryRun) {
    console.log("\n--dry-run: nothing written.");
    return;
  }

  for (const manifest of manifests) {
    writeFileSync(manifest.path, withVersion(manifest.raw, next));
  }
  console.log(`\nWrote ${manifests.length} manifests.`);
}

try {
  main();
} catch (error) {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
}
