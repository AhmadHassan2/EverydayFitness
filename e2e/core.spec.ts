import { expect, test, type Page } from "@playwright/test";

/* Private mode starts with an empty, browser-local tracker. */

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("opens an empty personal tracker without sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("Remaining")).toBeVisible();
  await expect(page.getByText(/demo|sample data/i)).toHaveCount(0);
  await noHorizontalOverflow(page);
});
