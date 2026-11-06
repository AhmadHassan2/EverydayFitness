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

test("quickly edits the daily calorie goal from Today", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Goals" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Daily calories (kcal)").fill("2500");
  await page.getByRole("button", { name: "Save goals" }).click();
  await expect(page.getByText("Goals saved")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("2,500", { exact: true })).toBeVisible();
});

test("tracks sodium and potassium without daily targets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add food" }).first().click();
  await page.getByRole("button", { name: "Manual" }).click();
  await page.getByLabel("Food", { exact: true }).fill("Banana");
  await page.getByLabel("Calories (kcal)").fill("105");
  await page.getByLabel("Sodium (mg)").fill("1");
  await page.getByLabel("Potassium (mg)").fill("422");
  await page.getByRole("button", { name: /^Add to / }).click();
  await expect(page.getByText(/422/)).toBeVisible();
});
