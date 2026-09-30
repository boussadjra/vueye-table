#!/usr/bin/env node
/**
 * Tag the published version and create its GitHub release.
 *
 * The package group shares one version, so a release is one tag, `v<version>`, and one GitHub
 * release whose notes are the `vueye-table` changelog entry for that version. A run is
 * idempotent: an existing tag or release is left alone, so a rerun after a failure only finishes
 * what is missing.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { packageNames, publishablePackages, repositoryRoot } from "./packages.mjs";
import { parseVersion } from "./semver.mjs";

function usage(message) {
  if (message) console.error(`\nError: ${message}`);
  console.error(`
Usage: pnpm release:tag [options]

Creates the git tag v<version> on HEAD, pushes it, and creates the GitHub
release with the vueye-table changelog entry as its notes. Needs git and the
GitHub CLI, authenticated through GH_TOKEN.

Options:
  --dry-run        Print the tag and the release notes, change nothing
  --help           Show this message
`);
  process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
  const options = { dryRun: false };
  for (const argument of argv) {
    if (argument === "--help" || argument === "-h") usage();
    else if (argument === "--dry-run") options.dryRun = true;
    else usage(`unknown option "${argument}"`);
  }
  return options;
}

function run(command, commandArguments, { allowFailure = false } = {}) {
  const result = spawnSync(command, commandArguments, { cwd: repositoryRoot, encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${commandArguments.join(" ")} failed:\n${result.stderr.trim()}`);
  }
  return { ok: result.status === 0, stdout: result.stdout.trim() };
}

function readVersion() {
  const versions = new Set(
    publishablePackages.map(
      (directory) =>
        JSON.parse(
          readFileSync(join(repositoryRoot, "packages", directory, "package.json"), "utf8"),
        ).version,
    ),
  );
  if (versions.size !== 1) {
    throw new Error(`packages are not in lockstep: ${[...versions].join(", ")}`);
  }
  const [version] = versions;
  if (!parseVersion(version)) throw new Error(`invalid version ${version}`);
  return version;
}

/** The body of the `## <version>` section of the vueye-table changelog, if it has one. */
function changelogEntry(version) {
  const path = join(repositoryRoot, "packages", "vueye-table", "CHANGELOG.md");
  if (!existsSync(path)) return undefined;
  const lines = readFileSync(path, "utf8").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return undefined;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
  return body || undefined;
}

function releaseNotes(version) {
  const packages = publishablePackages
    .map((directory) => packageNames[directory])
    .map((name) => `- [\`${name}@${version}\`](https://www.npmjs.com/package/${name}/v/${version})`)
    .join("\n");
  const entry = changelogEntry(version) ?? "See the package changelogs for details.";
  return `${entry}\n\n### Packages\n\n${packages}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const version = readVersion();
  const tag = `v${version}`;
  const prerelease = parseVersion(version).prerelease !== undefined;
  const notes = releaseNotes(version);

  if (options.dryRun) {
    console.log(`Tag: ${tag}${prerelease ? " (prerelease)" : ""}\n\n${notes}`);
    console.log("--dry-run: nothing tagged or released.");
    return;
  }

  const remoteTag = run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`]).stdout;
  if (remoteTag) {
    console.log(`Tag ${tag} already exists on origin.`);
  } else {
    run("git", [
      "-c",
      "user.name=github-actions[bot]",
      "-c",
      "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "tag",
      "--annotate",
      tag,
      "--message",
      tag,
    ]);
    run("git", ["push", "origin", `refs/tags/${tag}`]);
    console.log(`Pushed tag ${tag}.`);
  }

  if (run("gh", ["release", "view", tag], { allowFailure: true }).ok) {
    console.log(`Release ${tag} already exists.`);
    return;
  }
  const notesFile = join(tmpdir(), `vueye-table-${tag}.md`);
  writeFileSync(notesFile, notes);
  const releaseArguments = ["release", "create", tag, "--verify-tag", "--title", tag];
  releaseArguments.push("--notes-file", notesFile);
  // A prerelease never becomes the repository's "Latest" release.
  if (prerelease) releaseArguments.push("--prerelease", "--latest=false");
  run("gh", releaseArguments);
  console.log(`Created release ${tag}.`);
}

try {
  main();
} catch (error) {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
}
