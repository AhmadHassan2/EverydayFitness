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

test("quickly edits every daily goal from Today", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Goals" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Daily calories (kcal)").fill("2500");
  await page.getByLabel("Protein (g)").fill("180");
  await page.getByLabel("Carbs (g)").fill("260");
  await page.getByLabel("Fat (g)").fill("80");
  await page.getByRole("button", { name: "Save goals" }).click();
  await expect(page.getByText("Goals saved")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("2,500", { exact: true })).toBeVisible();
});
