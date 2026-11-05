import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// This automated WCAG 2.1 AA pass is separate from the actual NVDA session and
// the WCAG 2.2 clipped-target review recorded in ACCEPTANCE.md.
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
async function audit(page, testInfo, name) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  await testInfo.attach(name, {
    body: JSON.stringify(
      { url: page.url(), violations: result.violations, incomplete: result.incomplete },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect.soft(result.violations, `${name}: automated accessibility violations`).toEqual([]);
}

for (const theme of ["light", "dark"]) {
  test(`loaded consumer routes, menus and grid satisfy automated WCAG 2.1 AA checks, ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const routes = ["/", "/inventory", "/locations", "/receiving", "/layout"];
    async function auditRoute(index) {
      const route = routes[index];
      if (route === undefined) return;
      await page.goto(route);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.locator(".operations[data-hydrated]").waitFor();
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      if (theme === "dark")
        await page.getByRole("button", { name: "Dark mode", exact: true }).click();
      await audit(page, testInfo, `${route}-${theme}`);
      await auditRoute(index + 1);
    }
    await auditRoute(0);
    const columns = page
      .locator("details")
      .filter({ has: page.locator("summary").filter({ hasText: /^Columns$/ }) })
      .first();
    await columns.locator("summary").click();
    await audit(page, testInfo, `columns-menu-${theme}`);
    await columns.locator("summary").press("Escape");
    await page.getByLabel("Spreadsheet grid", { exact: true }).check();
    await audit(page, testInfo, `grouped-grid-${theme}`);
  });

  test(`initial loading text keeps readable contrast, ${theme}`, async ({ page }, testInfo) => {
    let release;
    const hold = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/orders**", async (route) => {
      await hold;
      await route.continue().catch(() => {});
    });
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[aria-busy="true"]')).toBeVisible();
      if (theme === "dark")
        await page.getByRole("button", { name: "Dark mode", exact: true }).click();
      await audit(page, testInfo, `loading-${theme}`);
    } finally {
      release();
    }
  });
}
