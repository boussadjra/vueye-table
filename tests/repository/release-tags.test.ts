import { describe, expect, it } from "vitest";

// @ts-expect-error The standalone release script does not ship TypeScript declarations.
import { isGitHubLatest, releaseTagFor } from "../../scripts/release-tags.mjs";

describe("release channels", () => {
  it("publishes the first 3.0 beta under beta even before a stable 3.x exists", () => {
    expect(
      releaseTagFor("3.0.0-beta.1", [new Set(["1.0.0", "2.0.0-alpha.14", "3.0.0-alpha.11"])]),
    ).toBe("beta");
    expect(releaseTagFor("3.0.0-beta.1", [new Set()])).toBe("beta");
  });
  it("retains the alpha policy and ignores stable releases from older majors", () => {
    expect(releaseTagFor("3.0.0-alpha.11", [new Set(["1.0.0", "3.0.0-alpha.10"])])).toBe("latest");
    expect(releaseTagFor("3.0.1-alpha.0", [new Set(), new Set(["3.0.0"])])).toBe("alpha");
  });
  it("keeps beta separate and sends stable releases to latest", () => {
    expect(releaseTagFor("3.0.1-beta.1", [new Set(["3.0.0"])])).toBe("beta");
    expect(releaseTagFor("3.0.0", [new Set(["3.0.0-beta.1"])])).toBe("latest");
  });
});

describe("GitHub latest release", () => {
  it("marks stable releases and betas or candidates of a new major as latest", () => {
    expect(isGitHubLatest("3.0.0")).toBe(true);
    expect(isGitHubLatest("3.0.0-beta.2")).toBe(true);
    expect(isGitHubLatest("3.0.0-rc.1")).toBe(true);
  });
  it("keeps alpha and prereleases of a later minor or patch as prereleases", () => {
    expect(isGitHubLatest("3.0.0-alpha.12")).toBe(false);
    expect(isGitHubLatest("3.1.0-beta.1")).toBe(false);
    expect(isGitHubLatest("3.0.1-rc.1")).toBe(false);
  });
});
