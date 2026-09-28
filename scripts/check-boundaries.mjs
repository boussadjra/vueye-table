import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

import {
  allowedInternalDependencies,
  collectImportSpecifiers,
  forbiddenFrameworks,
  forbiddenGlobals,
  forbiddenImports,
  githubRepository,
  githubRepositoryUrl,
  packageNames,
  packagesRoot,
  publishablePackages,
  readManifests,
  readPrivateWorkspaces,
  repositoryRoot,
  report,
  requiredManifestFields,
  toPackageName,
} from "./packages.mjs";

/**
 * Source-level boundary validation: manifests, the layer graph, imports, and runtime globals.
 */

const sourceExtensions = new Set([".js", ".mjs", ".mts", ".ts", ".vue", ".css"]);
const internalNames = new Set(Object.values(packageNames));
const failures = [];

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(absolutePath);
      }
      return sourceExtensions.has(extname(entry.name)) ? [absolutePath] : [];
    }),
  );
  return files.flat();
}

function isWithin(child, parent) {
  const pathFromParent = relative(parent, child);
  return (
    pathFromParent === "" || (!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== "..")
  );
}

function dependencyGroups(manifest) {
  return [
    manifest.dependencies ?? {},
    manifest.devDependencies ?? {},
    manifest.peerDependencies ?? {},
    manifest.optionalDependencies ?? {},
  ];
}

function validSideEffects(value) {
  return (
    value === false ||
    (Array.isArray(value) && value.length > 0 && value.every((pattern) => pattern.endsWith(".css")))
  );
}

function validateManifest(directory, manifest) {
  const packageFailures = [];
  const name = manifest.name ?? directory;

  if (manifest.name !== packageNames[directory]) {
    packageFailures.push(`${directory}: package name must be "${packageNames[directory]}"`);
  }
  for (const field of requiredManifestFields) {
    if (!(field in manifest)) {
      packageFailures.push(`${name}: missing required package metadata field "${field}"`);
    }
  }
  if (manifest.private === true) {
    packageFailures.push(`${name}: public package must not be marked private`);
  }
  if (manifest.publishConfig?.access !== "public") {
    packageFailures.push(`${name}: publishConfig.access must be "public"`);
  }
  if (manifest.publishConfig?.provenance !== true) {
    packageFailures.push(`${name}: publishConfig.provenance must be true`);
  }
  if (manifest.type !== "module") {
    packageFailures.push(`${name}: every package is ESM-only and must declare type "module"`);
  }
  if (!validSideEffects(manifest.sideEffects)) {
    packageFailures.push(`${name}: sideEffects must be false, or list only stylesheets`);
  }
  for (const file of ["dist", "LICENSE"]) {
    if (!Array.isArray(manifest.files) || !manifest.files.includes(file)) {
      packageFailures.push(`${name}: files must publish "${file}"`);
    }
  }

  const expectedRepository = `git+https://github.com/${githubRepository}.git`;
  if (manifest.repository?.url !== expectedRepository) {
    packageFailures.push(`${name}: repository.url must be "${expectedRepository}"`);
  }
  if (manifest.repository?.directory !== `packages/${directory}`) {
    packageFailures.push(`${name}: repository.directory must be "packages/${directory}"`);
  }
  if (manifest.homepage !== `${githubRepositoryUrl}#readme`) {
    packageFailures.push(`${name}: homepage must be "${githubRepositoryUrl}#readme"`);
  }
  if (manifest.bugs?.url !== `${githubRepositoryUrl}/issues`) {
    packageFailures.push(`${name}: bugs.url must be "${githubRepositoryUrl}/issues"`);
  }

  for (const group of dependencyGroups(manifest)) {
    for (const [dependency, range] of Object.entries(group)) {
      if (internalNames.has(dependency) && !range.startsWith("workspace:")) {
        packageFailures.push(
          `${name}: internal dependency "${dependency}" must use the workspace protocol`,
        );
      }
      if (forbiddenFrameworks.includes(dependency)) {
        packageFailures.push(`${name}: "${dependency}" is outside vueye-table's architecture`);
      }
    }
  }

  const runtimeDependencies = manifest.dependencies ?? {};
  for (const peer of Object.keys(manifest.peerDependencies ?? {})) {
    if (peer in runtimeDependencies) {
      packageFailures.push(`${name}: "${peer}" is both a peer and a runtime dependency`);
    }
    if (!(peer in (manifest.devDependencies ?? {}))) {
      packageFailures.push(`${name}: peer dependency "${peer}" is not installed for development`);
    }
  }

  const expected = new Set(allowedInternalDependencies[directory]);
  const declared = new Set(
    dependencyGroups(manifest).flatMap((group) =>
      Object.keys(group).filter((dependency) => internalNames.has(dependency)),
    ),
  );
  for (const dependency of declared) {
    if (!expected.has(dependency)) {
      packageFailures.push(`${name}: internal dependency "${dependency}" skips or inverts a layer`);
    }
  }
  for (const dependency of expected) {
    if (!(dependency in runtimeDependencies)) {
      packageFailures.push(`${name}: required internal dependency "${dependency}" is not declared`);
    }
  }
  return packageFailures;
}

async function validateSources(directory, manifest, root) {
  const packageFailures = [];
  const expected = new Set(allowedInternalDependencies[directory]);
  const declared = new Set(dependencyGroups(manifest).flatMap((group) => Object.keys(group)));
  const files = await collectSourceFiles(join(root, "src"));
  const sources = await Promise.all(
    files.map(async (file) => ({ file, source: await readFile(file, "utf8") })),
  );

  for (const { file, source } of sources) {
    const displayPath = relative(repositoryRoot, file);

    for (const specifier of collectImportSpecifiers(source)) {
      if (specifier.startsWith(".")) {
        if (!isWithin(resolve(dirname(file), specifier), root)) {
          packageFailures.push(
            `${displayPath}: relative import crosses a package boundary: ${specifier}`,
          );
        }
        continue;
      }
      const packageName = toPackageName(specifier);
      if (internalNames.has(packageName)) {
        if (!expected.has(packageName)) {
          packageFailures.push(`${displayPath}: import skips or inverts a layer: ${specifier}`);
        }
        if (specifier.includes("/src/")) {
          packageFailures.push(`${displayPath}: deep source import is forbidden: ${specifier}`);
        }
      } else if (packageName && !packageName.startsWith("node:") && !declared.has(packageName)) {
        packageFailures.push(`${displayPath}: "${packageName}" is imported but not declared`);
      }
      for (const forbidden of forbiddenImports[directory] ?? []) {
        if (forbidden.test(specifier)) {
          packageFailures.push(
            `${displayPath}: forbidden import for ${manifest.name}: ${specifier}`,
          );
        }
      }
    }

    for (const globalName of forbiddenGlobals[directory] ?? []) {
      if (new RegExp(`\\b${globalName}\\b`, "u").test(source)) {
        packageFailures.push(`${displayPath}: forbidden runtime global "${globalName}"`);
      }
    }
  }
  return packageFailures;
}

const manifests = await readManifests();
for (const directory of publishablePackages) {
  const manifest = manifests[directory];
  failures.push(...validateManifest(directory, manifest));
  failures.push(...(await validateSources(directory, manifest, join(packagesRoot, directory))));
}

for (const { group, directory, manifest } of await readPrivateWorkspaces()) {
  if (manifest.private !== true) {
    failures.push(`${group}/${directory}: non-publishable workspace must be marked private`);
  }
}

const rootManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
if (rootManifest.private !== true) {
  failures.push("the repository root must be marked private");
}

report("Dependency-boundary validation", failures);
