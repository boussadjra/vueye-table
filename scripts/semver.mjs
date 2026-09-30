const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

function parsePrerelease(value) {
  if (!value) return undefined;
  const identifiers = value.split(".");
  if (
    identifiers.some(
      (identifier) =>
        /^\d+$/u.test(identifier) && identifier.length > 1 && identifier.startsWith("0"),
    )
  ) {
    return undefined;
  }
  return identifiers.map((identifier) =>
    /^\d+$/u.test(identifier) ? Number(identifier) : identifier,
  );
}

export function parseVersion(value) {
  const match = versionPattern.exec(value);
  if (!match) return undefined;
  const prerelease = parsePrerelease(match[4]);
  if (match[4] && !prerelease) return undefined;
  const [major, minor, patch] = match.slice(1, 4).map(Number);
  const suffix = prerelease?.length ? `-${prerelease.join(".")}` : "";
  return { major, minor, patch, prerelease, raw: `${major}.${minor}.${patch}${suffix}` };
}

function compareIdentifier(left, right) {
  if (left === right) return 0;
  if (typeof left === "number") return -1;
  if (typeof right === "number") return 1;
  return left < right ? -1 : 1;
}

export function compareVersions(left, right) {
  const parsedLeft = typeof left === "string" ? parseVersion(left) : left;
  const parsedRight = typeof right === "string" ? parseVersion(right) : right;
  if (!parsedLeft || !parsedRight) throw new Error("cannot compare invalid semver versions");

  for (const key of ["major", "minor", "patch"]) {
    if (parsedLeft[key] !== parsedRight[key]) return parsedLeft[key] < parsedRight[key] ? -1 : 1;
  }
  if (!parsedLeft.prerelease && !parsedRight.prerelease) return 0;
  if (!parsedLeft.prerelease) return 1;
  if (!parsedRight.prerelease) return -1;

  const length = Math.max(parsedLeft.prerelease.length, parsedRight.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = parsedLeft.prerelease[index];
    const rightIdentifier = parsedRight.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    const comparison = compareIdentifier(leftIdentifier, rightIdentifier);
    if (comparison) return comparison;
  }
  return 0;
}

function formatVersion({ major, minor, patch, prerelease }) {
  const suffix = prerelease?.length ? `-${prerelease.join(".")}` : "";
  return `${major}.${minor}.${patch}${suffix}`;
}

function preidFor(current, preid) {
  if (preid) {
    if (
      !/^[0-9A-Za-z-]+$/u.test(preid) ||
      (/^\d+$/u.test(preid) && preid.length > 1 && preid.startsWith("0"))
    ) {
      throw new Error(`invalid prerelease identifier: ${preid}`);
    }
    return preid;
  }
  return typeof current.prerelease?.[0] === "string" ? current.prerelease[0] : "alpha";
}

function incrementPrerelease(current, preid) {
  const identifier = preidFor(current, preid);
  if (!current.prerelease || current.prerelease[0] !== identifier) {
    return formatVersion({ ...current, prerelease: [identifier, 0] });
  }

  const prerelease = [...current.prerelease];
  const last = prerelease.at(-1);
  if (typeof last === "number") prerelease[prerelease.length - 1] = last + 1;
  else prerelease.push(0);
  return formatVersion({ ...current, prerelease });
}

export function incrementVersion(value, releaseType, preid) {
  const current = parseVersion(value);
  if (!current) throw new Error(`invalid semver version: ${value}`);
  if (releaseType === "major") {
    const major =
      current.prerelease && current.minor === 0 && current.patch === 0
        ? current.major
        : current.major + 1;
    return formatVersion({ major, minor: 0, patch: 0 });
  }
  if (releaseType === "minor") {
    const minor = current.prerelease && current.patch === 0 ? current.minor : current.minor + 1;
    return formatVersion({ major: current.major, minor, patch: 0 });
  }
  if (releaseType === "patch") {
    const patch = current.prerelease ? current.patch : current.patch + 1;
    return formatVersion({ major: current.major, minor: current.minor, patch });
  }
  if (releaseType === "premajor") {
    return formatVersion({
      major: current.major + 1,
      minor: 0,
      patch: 0,
      prerelease: [preidFor(current, preid), 0],
    });
  }
  if (releaseType === "preminor") {
    return formatVersion({
      major: current.major,
      minor: current.minor + 1,
      patch: 0,
      prerelease: [preidFor(current, preid), 0],
    });
  }
  if (releaseType === "prepatch") {
    return formatVersion({
      major: current.major,
      minor: current.minor,
      patch: current.patch + 1,
      prerelease: [preidFor(current, preid), 0],
    });
  }
  if (releaseType === "prerelease") {
    if (!current.prerelease) {
      return formatVersion({
        ...current,
        patch: current.patch + 1,
        prerelease: [preidFor(current, preid), 0],
      });
    }
    return incrementPrerelease(current, preid);
  }
  throw new Error(`unsupported release type: ${releaseType}`);
}
