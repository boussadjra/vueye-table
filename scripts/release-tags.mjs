import { parseVersion } from "./semver.mjs";

/** Beta always has an explicit channel; alpha retains its established latest policy. */
export function releaseTagFor(version, publishedSets) {
  const { major, prerelease } = parseVersion(version);
  if (typeof prerelease?.[0] !== "string") return "latest";
  if (prerelease[0] === "beta") return "beta";
  const stableExists = publishedSets.some((published) =>
    [...published].some((name) => {
      const parsed = parseVersion(name);
      return parsed !== undefined && parsed.prerelease === undefined && parsed.major === major;
    }),
  );
  return stableExists ? prerelease[0] : "latest";
}
