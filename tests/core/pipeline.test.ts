import { getPath, paginationItems, setPath } from "@vueye-table/core";
import { describe, expect, it } from "vitest";

describe("paginationItems", () => {
  const pages = (page: number, count: number) =>
    paginationItems(page, count).map((item) => (item.type === "gap" ? "…" : item.page));

  it("shows the ends, the neighbors, and gaps", () => {
    expect(pages(1, 1)).toEqual([1]);
    expect(pages(1, 3)).toEqual([1, 2, 3]);
    expect(pages(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(pages(1, 10)).toEqual([1, 2, "…", 10]);
  });

  it("never hides a single page behind a gap", () => {
    expect(pages(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(paginationItems(2, 3).find((item) => item.type === "page" && item.current)).toEqual({
      type: "page",
      page: 2,
      current: true,
    });
  });
});

describe("paths", () => {
  it("reads missing steps as undefined", () => {
    expect(getPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(getPath({ a: null }, "a.b")).toBeUndefined();
    expect(getPath(undefined, "a")).toBeUndefined();
  });

  it("copies only the objects along the path", () => {
    const shared = { keep: true };
    const source = { a: { b: 1, shared }, other: shared };
    const next = setPath(source, "a.b", 2);
    expect(next).toEqual({ a: { b: 2, shared }, other: shared });
    expect(next.other).toBe(shared);
    expect(next.a.shared).toBe(shared);
    expect(source.a.b).toBe(1);
    expect(setPath({}, "x.y", 1)).toEqual({ x: { y: 1 } });
  });
});
