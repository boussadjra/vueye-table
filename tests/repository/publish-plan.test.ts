import { describe, expect, it, vi } from "vitest";

// @ts-expect-error The standalone release script does not ship TypeScript declarations.
import { executePublishPlan } from "../../scripts/publish-plan.mjs";

const version = "3.0.0-beta.3";
const options = { version, tags: ["beta", "latest"], dryRun: false, otp: "123456" };

type PlanItem = {
  name: string;
  alreadyPublished: boolean;
  distTags: Record<string, string>;
};

function actions() {
  return {
    publish: vi.fn<(name: string, options: { tag: string; otp?: string }) => Promise<boolean>>(
      async () => true,
    ),
    updateTag: vi.fn<
      (name: string, version: string, tag: string, options: { otp?: string }) => Promise<boolean>
    >(async () => true),
    log: vi.fn<(message: string) => void>(),
  };
}

describe("package publication and dist-tag synchronization", () => {
  it.each([
    { dryRun: false, tag: "beta" },
    { dryRun: false, tag: "latest" },
    { dryRun: true, tag: "beta" },
    { dryRun: true, tag: "latest" },
  ])("refuses a $tag rollback before any mutations (dry run: $dryRun)", async ({ dryRun, tag }) => {
    const calls = actions();
    await expect(
      executePublishPlan(
        [
          { name: "@vueye-table/core", alreadyPublished: false, distTags: {} },
          {
            name: "vueye-table",
            alreadyPublished: true,
            distTags: { [tag]: "3.0.0-beta.10" },
          },
        ],
        { ...options, dryRun },
        calls,
      ),
    ).rejects.toThrow(/3\.0\.0-beta\.10/);
    expect(calls.publish).not.toHaveBeenCalled();
    expect(calls.updateTag).not.toHaveBeenCalled();
  });

  it("allows an explicitly requested tag downgrade", async () => {
    const calls = actions();
    await expect(
      executePublishPlan(
        [
          {
            name: "vueye-table",
            alreadyPublished: true,
            distTags: { beta: "3.0.0-beta.10", latest: "3.0.0" },
          },
        ],
        { ...options, allowTagDowngrade: true },
        calls,
      ),
    ).resolves.toEqual({ publishedCount: 0, taggedCount: 2 });
    expect(calls.updateTag.mock.calls.map((call) => call[2])).toEqual(["beta", "latest"]);
  });

  it("publishes every missing package before synchronizing beta and then latest", async () => {
    const plan: PlanItem[] = [
      { name: "@vueye-table/core", alreadyPublished: false, distTags: {} },
      { name: "@vueye-table/vue", alreadyPublished: false, distTags: {} },
      {
        name: "vueye-table",
        alreadyPublished: true,
        distTags: { beta: "3.0.0-beta.2", latest: "3.0.0-alpha.12" },
      },
    ];
    const calls = actions();
    const events: string[] = [];
    calls.publish.mockImplementation(async (name) => {
      events.push(`publish:${name}`);
      return true;
    });
    calls.updateTag.mockImplementation(async (name, _version, tag) => {
      events.push(`${tag}:${name}`);
      return true;
    });

    await expect(executePublishPlan(plan, options, calls)).resolves.toEqual({
      publishedCount: 2,
      taggedCount: 4,
    });
    expect(events).toEqual([
      "publish:@vueye-table/core",
      "publish:@vueye-table/vue",
      "beta:vueye-table",
      "latest:@vueye-table/core",
      "latest:@vueye-table/vue",
      "latest:vueye-table",
    ]);
    expect(calls.publish).toHaveBeenCalledWith("@vueye-table/core", {
      tag: "beta",
      otp: "123456",
    });
    expect(calls.updateTag).toHaveBeenCalledWith("vueye-table", version, "latest", {
      otp: "123456",
    });
  });

  it("repairs latest when the requested version is already published", async () => {
    const calls = actions();
    await expect(
      executePublishPlan(
        [
          {
            name: "vueye-table",
            alreadyPublished: true,
            distTags: { beta: version, latest: "3.0.0-alpha.12" },
          },
        ],
        options,
        calls,
      ),
    ).resolves.toEqual({ publishedCount: 0, taggedCount: 1 });
    expect(calls.publish).not.toHaveBeenCalled();
    expect(calls.updateTag).toHaveBeenCalledExactlyOnceWith("vueye-table", version, "latest", {
      otp: "123456",
    });
  });

  it("skips tags that already identify the requested version", async () => {
    const calls = actions();
    await expect(
      executePublishPlan(
        [
          {
            name: "vueye-table",
            alreadyPublished: true,
            distTags: { beta: version, latest: version },
          },
        ],
        options,
        calls,
      ),
    ).resolves.toEqual({ publishedCount: 0, taggedCount: 0 });
    expect(calls.publish).not.toHaveBeenCalled();
    expect(calls.updateTag).not.toHaveBeenCalled();
  });

  it("honors a single overridden tag without updating beta or latest", async () => {
    const calls = actions();
    await expect(
      executePublishPlan(
        [
          { name: "@vueye-table/core", alreadyPublished: false, distTags: {} },
          { name: "vueye-table", alreadyPublished: true, distTags: {} },
        ],
        { ...options, tags: ["next"] },
        calls,
      ),
    ).resolves.toEqual({ publishedCount: 1, taggedCount: 1 });
    expect(calls.publish).toHaveBeenCalledExactlyOnceWith("@vueye-table/core", {
      tag: "next",
      otp: "123456",
    });
    expect(calls.updateTag).toHaveBeenCalledExactlyOnceWith("vueye-table", version, "next", {
      otp: "123456",
    });
  });

  it("does not retag any package when publication fails", async () => {
    const calls = actions();
    calls.publish.mockResolvedValue(false);
    await expect(
      executePublishPlan(
        [
          { name: "vueye-table", alreadyPublished: true, distTags: {} },
          { name: "@vueye-table/core", alreadyPublished: false, distTags: {} },
        ],
        options,
        calls,
      ),
    ).rejects.toThrow(/publish|publication/i);
    expect(calls.updateTag).not.toHaveBeenCalled();
  });

  it("stops before latest on beta synchronization failure and resumes from refreshed tags", async () => {
    const plan: PlanItem[] = [
      { name: "@vueye-table/core", alreadyPublished: true, distTags: {} },
      { name: "vueye-table", alreadyPublished: true, distTags: {} },
    ];
    const calls = actions();
    calls.updateTag.mockImplementation(async (name, updatedVersion, tag) => {
      if (name === "vueye-table") return false;
      const item = plan.find((entry) => entry.name === name);
      if (item) item.distTags[tag] = updatedVersion;
      return true;
    });

    const failure = await executePublishPlan(plan, options, calls).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).toMatch(/vueye-table/);
    expect(String(failure)).toMatch(/beta/);
    expect(String(failure)).toMatch(/retry|rerun/i);
    expect(calls.updateTag.mock.calls.map((call) => call[2])).toEqual(["beta", "beta"]);

    const retry = actions();
    await expect(executePublishPlan(plan, options, retry)).resolves.toEqual({
      publishedCount: 0,
      taggedCount: 3,
    });
    expect(retry.publish).not.toHaveBeenCalled();
    expect(retry.updateTag.mock.calls.map((call) => [call[0], call[2]])).toEqual([
      ["vueye-table", "beta"],
      ["@vueye-table/core", "latest"],
      ["vueye-table", "latest"],
    ]);
  });

  it("reports a latest-tag failure with enough information to retry", async () => {
    const calls = actions();
    calls.updateTag.mockResolvedValue(false);
    const failure = await executePublishPlan(
      [{ name: "vueye-table", alreadyPublished: true, distTags: { beta: version } }],
      options,
      calls,
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).toMatch(/vueye-table/);
    expect(String(failure)).toMatch(/latest/);
    expect(String(failure)).toMatch(/retry|rerun/i);
  });

  it("makes no registry mutations during a dry run", async () => {
    const calls = actions();
    await expect(
      executePublishPlan(
        [
          { name: "@vueye-table/core", alreadyPublished: false, distTags: {} },
          { name: "vueye-table", alreadyPublished: true, distTags: {} },
        ],
        { ...options, dryRun: true },
        calls,
      ),
    ).resolves.toEqual({ publishedCount: 0, taggedCount: 0 });
    expect(calls.publish).not.toHaveBeenCalled();
    expect(calls.updateTag).not.toHaveBeenCalled();
  });
});
