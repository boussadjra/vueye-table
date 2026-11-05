import { expect, test } from "@playwright/test";

for (const rtl of [false, true]) {
  test(`column resizing commits on release and supports keyboard limits, rtl=${rtl}`, async ({
    page,
  }) => {
    await page.goto("/layout");
    if (rtl) await page.getByLabel("Right-to-left layout", { exact: true }).check();
    const handle = page.getByRole("separator", { name: "Resize Item", exact: true });
    await handle.focus();
    await expect(handle).toBeFocused();
    await expect(handle).toHaveAttribute("aria-valuenow", "200");
    await handle.press("ArrowRight");
    await expect(handle).toHaveAttribute("aria-valuenow", rtl ? "190" : "210");
    await handle.press("Home");
    await expect(handle).toHaveAttribute("aria-valuenow", "140");
    await handle.press("End");
    await expect(handle).toHaveAttribute("aria-valuenow", "300");
    await page.getByRole("button", { name: "Reset layout", exact: true }).click();
    const bounds = await handle.boundingBox();
    expect(bounds).not.toBeNull();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + (rtl ? -30 : 30), y, { steps: 4 });
    await expect(handle).toHaveAttribute("aria-valuenow", "230");
    await expect(page.getByRole("status")).toContainText("Item width 200 pixels");
    await page.mouse.up();
    await expect(page.getByRole("status")).toContainText("Item width 230 pixels");
    await expect(handle).toBeFocused();
  });

  test(`pinned regions survive both-axis scrolling and grid navigation, rtl=${rtl}`, async ({
    page,
  }) => {
    await page.goto("/layout");
    if (rtl) await page.getByLabel("Right-to-left layout", { exact: true }).check();
    await page.getByLabel("Spreadsheet grid", { exact: true }).check();
    const grid = page.getByRole("treegrid", { name: "RC grouped layout", exact: true });
    const viewport = page.locator("[data-virtual-viewport]");
    const start = grid.locator('th[data-column="name"]');
    const end = grid.locator('th[data-column="period-8"]');
    const beforeStart = await start.boundingBox();
    const beforeEnd = await end.boundingBox();
    const bottom = grid.locator('[data-row-region="bottom"]');
    const bottomCell = bottom.getByRole("gridcell", { name: "All-line total", exact: true });
    const beforeBottom = await bottomCell.boundingBox();
    await viewport.evaluate((element, direction) => {
      element.scrollTop = 9000;
      element.scrollLeft = direction ? -900 : 900;
    }, rtl);
    await expect.poll(async () => (await start.boundingBox()).x).toBeCloseTo(beforeStart.x, 0);
    await expect.poll(async () => (await end.boundingBox()).x).toBeCloseTo(beforeEnd.x, 0);
    await expect
      .poll(async () => (await bottomCell.boundingBox()).y)
      .toBeCloseTo(beforeBottom.y, 0);
    expect(await grid.getByRole("gridcell").count()).toBeLessThan(350);
    await grid.press("Control+End");
    const last = bottom.locator('[role="gridcell"][aria-colindex="14"]');
    await expect(last).toHaveAttribute("aria-selected", "true");
    await expect(last).toHaveAttribute("aria-readonly", "true");
    const active = await grid.getAttribute("aria-activedescendant");
    await expect(page.locator(`[id="${active}"]`)).toBeVisible();
    await grid.press("Control+Home");
    await expect(
      grid
        .locator('[data-row-region="top"]')
        .getByRole("gridcell", { name: "Priority reference", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  });
}

test("group selection, weighted totals and reference scope survive filtering and collapse", async ({
  page,
}) => {
  await page.goto("/layout");
  const table = page.getByRole("treegrid", { name: "RC grouped layout", exact: true });
  const north = table.getByRole("row").filter({
    has: page.getByRole("button", { name: "Collapse Team: North, 500 rows", exact: true }),
  });
  await expect(north.getByRole("gridcell", { name: "45000", exact: true })).toBeVisible();
  await expect(north.getByRole("gridcell", { name: "90.0%", exact: true })).toBeVisible();
  await north.getByRole("checkbox").check();
  await expect(table.locator('[data-row-region="top"] input')).not.toBeChecked();
  await expect(table.locator('[data-row-region="bottom"] input')).not.toBeChecked();
  const toggle = table.getByRole("button", { name: /^(Collapse|Expand) Team: North, 500 rows$/ });
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByPlaceholder("Filter layout lines").fill("Line 1999");
  const group = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "Collapse Team: East, 1 row", exact: true }) });
  await expect(group.getByRole("gridcell", { name: "190", exact: true })).toBeVisible();
  await expect(group.getByRole("gridcell", { name: "95.0%", exact: true })).toBeVisible();
  await expect(
    table
      .locator('[data-row-region="bottom"]')
      .getByRole("gridcell", { name: "210000", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Aggregate footers", { exact: true }).check();
  await expect(
    table
      .getByRole("row")
      .filter({ hasText: "190" })
      .getByRole("gridcell", { name: "95.0%", exact: true }),
  ).toHaveCount(2);
  await page.getByPlaceholder("Filter layout lines").fill("does-not-exist");
  await expect(table.getByText("All-line total", { exact: true })).toBeVisible();
  await expect(table.getByText("Priority reference", { exact: true })).toBeVisible();
});

test("column and grouping menus work with keyboard and stay above sticky cells", async ({
  page,
}) => {
  await page.goto("/layout");
  const columns = page
    .locator("details")
    .filter({ has: page.locator("summary").filter({ hasText: /^Columns$/ }) })
    .first();
  const summary = columns.locator("summary");
  await summary.focus();
  await summary.press("Enter");
  const pin = columns.getByRole("combobox", { name: "Pin position for Item", exact: true });
  await expect(pin).toBeVisible();
  const box = await pin.boundingBox();
  const hit = await pin.evaluate(
    (element, point) => element === document.elementFromPoint(point.x, point.y),
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(hit).toBe(true);
  await pin.focus();
  await pin.press("End");
  await expect(pin).toHaveValue("end");
  await summary.focus();
  await summary.press("Escape");
  await expect(summary).toBeFocused();
  const grouping = page
    .locator("details")
    .filter({ has: page.locator("summary").filter({ hasText: /^Group by$/ }) })
    .first();
  await grouping.locator("summary").focus();
  await grouping.locator("summary").press("Enter");
  const remove = grouping.getByRole("button", { name: /Remove.*Team|Team.*Remove/ });
  await remove.focus();
  await remove.press("Enter");
  await expect(page.getByRole("status")).toContainText("0 grouping levels");
  await grouping.locator("summary").focus();
  await grouping.locator("summary").press("Escape");
  await expect(grouping.locator("summary")).toBeFocused();
});
