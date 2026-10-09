import { expect, test } from "@playwright/test";

for (const width of [1280, 390])
  for (const theme of ["light", "dark"])
    for (const key of ["stock-1", "stock-2000"])
      test(`pointer menu ${key}, ${width}px, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/inventory");
        if (theme === "dark")
          await page.getByRole("button", { name: "Dark mode", exact: true }).click();
        const grid = page.getByRole("grid", { name: "Warehouse stock worksheet" });
        await expect(grid).toHaveAttribute("aria-colcount", "9");
        await grid.press(key === "stock-2000" ? "Control+End" : "Control+Home");
        await page.locator(`summary[aria-label="Actions for row ${key}"]`).click();
        const remove = page.getByRole("button", { name: `Remove row, row ${key}`, exact: true });
        await expect(remove).toBeVisible();
        // A normal pointer click must hit the actual button without forcing through another cell.
        await remove.click();
        await expect(page.getByText("1 pending rows", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        await expect(page.getByText("0 pending rows", { exact: true })).toBeVisible();
      });

test("lazy search contexts preserve selection, loaded branches and keyboard traversal", async ({
  page,
}) => {
  await page.goto("/locations");
  const table = page.getByRole("treegrid", { name: "Warehouse location tree" });
  await expect(table).toHaveAttribute("aria-colcount", "4");
  const warehouse = table.getByRole("row").filter({ hasText: "Algiers" });
  await warehouse.getByRole("button", { name: "Expand row", exact: true }).click();
  const aisle = table.getByRole("row").filter({ hasText: "Aisle 1", hasNotText: /Aisle 1[012]/ });
  await aisle.getByRole("button", { name: "Expand row", exact: true }).click();
  await expect(table.getByText("Bin 01", { exact: true })).toBeVisible();
  await aisle.getByRole("checkbox", { name: "Select row", exact: true }).check();
  await expect(page.getByText("25 locations selected", { exact: true })).toBeVisible();
  const search = page.getByPlaceholder("Search loaded locations…");
  await search.fill("Bin 01");
  await expect(table.getByText("Algiers", { exact: true })).toBeVisible();
  await page.getByLabel("Search context").selectOption("strict");
  await expect(table.getByText("Algiers", { exact: true })).toHaveCount(0);
  await search.fill("Algiers");
  await page.getByLabel("Search context").selectOption("descendants");
  await expect(table.getByText("Aisle 1", { exact: true })).toBeVisible();
  await page.getByLabel("Search context").selectOption("ancestors");
  await expect(table.getByText("Aisle 1", { exact: true })).toHaveCount(0);
  await search.fill("");
  await expect(table.getByText("Bin 01", { exact: true })).toBeVisible();
  await expect(page.getByText("2 branch requests", { exact: true })).toBeVisible();
  await expect(page.getByText("25 locations selected", { exact: true })).toBeVisible();
  await aisle.press("ArrowLeft");
  await expect(aisle).toHaveAttribute("aria-expanded", "false");
  await expect(aisle).toBeFocused();
  await aisle.press("ArrowLeft");
  await expect(warehouse).toBeFocused();
  await warehouse.press("ArrowRight");
  await expect(aisle).toBeFocused();
  await aisle.press("ArrowRight");
  await expect(aisle).toHaveAttribute("aria-expanded", "true");
  await aisle.press("ArrowDown");
  const bin = table.getByRole("row").filter({ hasText: "Bin 01" });
  await expect(bin).toBeFocused();
  await bin.press("ArrowUp");
  await expect(aisle).toBeFocused();
  await aisle.press("End");
  await expect(table.getByRole("row").filter({ hasText: "Rotterdam" })).toBeFocused();
  await table.getByRole("row").filter({ hasText: "Rotterdam" }).press("Home");
  await expect(warehouse).toBeFocused();
});

test("100k by 24 navigation renders a bounded grid with full column coordinates", async ({
  page,
}) => {
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Stress 100,000 rows", exact: true }).click();
  const grid = page.getByRole("grid", { name: "Warehouse stock worksheet" });
  await expect(grid).toHaveAttribute("aria-colcount", "25");
  await grid.press("Control+End");
  const last = grid.locator('[role="gridcell"][aria-colindex="25"]').filter({ hasText: "614" });
  await expect(last).toBeVisible();
  await expect(last).toHaveAttribute("aria-selected", "true");
  expect(await grid.getByRole("gridcell").count()).toBeLessThan(300);
  await grid.press("Control+Home");
  await expect(grid.getByRole("gridcell", { name: "SKU-00001", exact: true })).toBeVisible();
  expect(await grid.getByRole("gridcell").count()).toBeLessThan(300);
});

test("an active editor retains its draft during wheel scrolling and can commit and undo", async ({
  page,
}) => {
  await page.goto("/inventory");
  const grid = page.getByRole("grid", { name: "Warehouse stock worksheet" });
  await grid.getByRole("gridcell", { name: "Field notebook", exact: true }).first().dblclick();
  const editor = page.getByRole("textbox", { name: "Edit Product", exact: true });
  await expect(editor).toHaveValue("Field notebook");
  await editor.fill("Retained browser draft");
  const viewport = page.locator("[data-virtual-viewport]");
  // Wheel motion is asynchronous and bounded differently by each browser. Keep using real
  // wheel input past two viewport heights and back to zero, checking retention at each step.
  async function scrollWithWheel(delta, target, remaining) {
    const before = await viewport.evaluate((element) => element.scrollTop);
    if ((delta > 0 ? before >= target : before <= target) || remaining === 0) return;
    await viewport.hover();
    await page.mouse.wheel(0, delta);
    const movement = expect.poll(() => viewport.evaluate((element) => element.scrollTop));
    if (delta > 0) await movement.toBeGreaterThan(before);
    else await movement.toBeLessThan(before);
    await expect(editor).toHaveValue("Retained browser draft");
    await expect(page.getByText("0 pending rows", { exact: true })).toBeVisible();
    await scrollWithWheel(delta, target, remaining - 1);
  }
  const distance = await viewport.evaluate((element) => Math.max(500, element.clientHeight * 2));
  await scrollWithWheel(1500, distance, 12);
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThanOrEqual(distance);
  await scrollWithWheel(-1500, 0, 12);
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(editor).toHaveValue("Retained browser draft");
  await editor.press("Enter");
  await expect(
    grid.getByRole("gridcell", { name: "Retained browser draft", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("0 pending rows", { exact: true })).toBeVisible();
});

test("multilingual receiving remains literal text and closes HTTP streams", async ({ page }) => {
  await page.goto("/receiving");
  await page.getByRole("button", { name: "Start receiving", exact: true }).click();
  await expect(
    page.getByText("استلام شحنة · Étiquette vérifiée", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("<script>literal warehouse note</script>", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /1.?000 of 1.?000 deliveries · done/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop receiving", exact: true }).click();
  await page.getByRole("combobox", { name: "Deliveries", exact: true }).selectOption("10000");
  await page.getByRole("button", { name: "Start receiving", exact: true }).click();
  await expect(
    page.getByText("استلام شحنة · Étiquette vérifiée", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop receiving", exact: true }).click();
  await page.getByRole("button", { name: "Check open connections", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("0 receiving connections open on the server.");
});
