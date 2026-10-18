import { compareVersions } from "./semver.mjs";

/**
 * Complete publication before promoting channels. Registry metadata is refreshed by the
 * caller on each run, so a retry repairs tags without republishing existing versions.
 */
export async function executePublishPlan(
  plan,
  { version, tags, dryRun, otp, allowTagDowngrade = false },
  { publish, updateTag, log = console.log },
) {
  if (!allowTagDowngrade) {
    for (const { name, distTags } of plan) {
      for (const tag of tags) {
        if (distTags[tag] && compareVersions(distTags[tag], version) > 0) {
          throw new Error(
            `${name}: tag "${tag}" already points to newer version ${distTags[tag]}. Refusing to move it back to ${version}; use --tag ${tag} only for an intentional rollback.`,
          );
        }
      }
    }
  }
  if (dryRun) return { publishedCount: 0, taggedCount: 0 };

  const pending = plan.filter(({ alreadyPublished }) => !alreadyPublished);
  const newlyPublished = new Set();
  const failed = [];
  for (const [index, { name }] of pending.entries()) {
    log(`\n-- ${name} (${index + 1}/${pending.length}) --`);
    if (await publish(name, { otp, tag: tags[0] })) newlyPublished.add(name);
    else failed.push(name);
  }
  if (failed.length > 0) {
    throw new Error(
      `Publication failed: ${failed.join(", ")}. Rerun to retry unfinished packages before synchronizing tags.`,
    );
  }

  let taggedCount = 0;
  for (const tag of tags) {
    for (const { name, distTags } of plan) {
      if (distTags[tag] === version || (tag === tags[0] && newlyPublished.has(name))) continue;
      log(`\n-- ${name}@${version}: ${tag} --`);
      if (!(await updateTag(name, version, tag, { otp }))) {
        throw new Error(
          `Could not update ${name}@${version} tag "${tag}". Rerun to retry unfinished tag updates.`,
        );
      }
      taggedCount += 1;
    }
  }
  return { publishedCount: newlyPublished.size, taggedCount };
}
