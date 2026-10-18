import { parseVersion } from "./semver.mjs";

/** The primary channel; beta also advances latest through releaseTagsFor. */
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

/** Every tag to synchronize, unless the caller explicitly chooses a single channel. */
export function releaseTagsFor(version, publishedSets, overrideTag) {
  if (overrideTag) return [overrideTag];
  const tag = releaseTagFor(version, publishedSets);
  return tag === "beta" ? ["beta", "latest"] : [tag];
}

/**
 * Whether the release becomes the repository's "Latest" release. GitHub never lets a prerelease
 * be Latest, so a release that should be is created as a full release. Stable versions are. So is
 * a beta or release candidate of a new major (`3.0.0-beta.2`): no stable of that major exists
 * yet, and without it GitHub would keep showing the previous major as Latest. Alpha, and a
 * prerelease of a later minor or patch, stay prereleases.
 */
export function isGitHubLatest(version) {
  const { minor, patch, prerelease } = parseVersion(version);
  if (!prerelease) return true;
  const [channel] = prerelease;
  return minor === 0 && patch === 0 && (channel === "beta" || channel === "rc");
}
