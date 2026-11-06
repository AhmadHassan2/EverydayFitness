import { expect, test, type Page } from "@playwright/test";

/*
 * Core flows in demo mode (no Supabase env). Each test gets a fresh browser
 * context, so the demo store is re-seeded every time.
 */

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

function eaten(page: Page) {
  return page.locator("dt", { hasText: "Eaten" }).locator("xpath=following-sibling::dd[1]");
}

async function openAddFood(page: Page) {
  const fab = page.getByRole("button", { name: "Add food" }).filter({ visible: true }).first();
  await fab.click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("today dashboard renders without overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("Remaining")).toBeVisible();
  await expect(page.getByText("Protein").first()).toBeVisible();
  await noHorizontalOverflow(page);
});

test("logs a food with one tap and updates totals", async ({ page }) => {
  await page.goto("/");
  await expect(eaten(page)).toBeVisible();
  const before = Number((await eaten(page).innerText()).replace(/[^\d]/g, ""));

  await openAddFood(page);
  await page.getByRole("button", { name: /^Log Protein bar/ }).first().click();
  await expect(page.getByText(/Added Protein bar/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await expect.poll(async () => Number((await eaten(page).innerText()).replace(/[^\d]/g, ""))).toBe(before + 210);
});

test("logs a manual entry, then edits and deletes it", async ({ page }) => {
  await page.goto("/");
  await openAddFood(page);
  await page.getByRole("button", { name: "Manual" }).click();
  await page.getByLabel("Food", { exact: true }).fill("Test sandwich");
  await page.getByLabel("Calories (kcal)").fill("333");
  await page.getByLabel("Protein (g)").fill("21,5");
  await page.getByRole("button", { name: /^Add to / }).click();

  const row = page.getByRole("button", { name: /Test sandwich/ }).first();
  await expect(row).toBeVisible();
  await expect(page.getByText("P 22").first()).toBeVisible();

  await row.click();
  await page.getByLabel("Calories (kcal)").fill("350");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("350", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Options for Test sandwich" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("button", { name: /Test sandwich/ })).toHaveCount(0);
});

test("rejects invalid nutrition input", async ({ page }) => {
  await page.goto("/");
  await openAddFood(page);
  await page.getByRole("button", { name: "Manual" }).click();
  await page.getByLabel("Food", { exact: true }).fill("Bad");
  await page.getByLabel("Calories (kcal)").fill("12kcal");
  await page.getByRole("button", { name: /^Add to / }).click();
  await expect(page.getByText("Numbers only")).toBeVisible();
});

test("marks training with one tap and toggles it off", async ({ page }) => {
  await page.goto("/");
  const trained = page.getByRole("button", { name: "Trained", exact: true });
  const rest = page.getByRole("button", { name: "Rest day", exact: true });
  await trained.click();
  await expect(trained).toHaveAttribute("aria-pressed", "true");
  await rest.click();
  await expect(rest).toHaveAttribute("aria-pressed", "true");
  await expect(trained).toHaveAttribute("aria-pressed", "false");
  await rest.click();
  await expect(rest).toHaveAttribute("aria-pressed", "false");
});

test("history: select a past day and edit it", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByRole("grid")).toBeVisible();
  await noHorizontalOverflow(page);
  // Yesterday is selected by default; add a food to it.
  await page.getByRole("button", { name: /^Add to (breakfast|lunch|dinner|snack)$/ }).first().click();
  await page.getByRole("button", { name: /^Log Whey shake/ }).first().click();
  await expect(page.getByText(/Added Whey shake/)).toBeVisible();
});

test("analytics switches ranges", async ({ page }) => {
  await page.goto("/analytics");
  await expect(page.getByText("Daily intake")).toBeVisible();
  for (const r of ["7 days", "90 days", "30 days"]) {
    await page.getByRole("radio", { name: r }).click();
    await expect(page.getByText(/of \d+ days logged/).first()).toBeVisible();
  }
  await page.getByRole("radio", { name: "Table" }).first().click();
  await expect(page.getByRole("table").first()).toBeVisible();
  await noHorizontalOverflow(page);
});

test("settings: goals change applies from today only", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Daily calories (kcal)").fill("2500");
  await page.getByRole("button", { name: "Save goals" }).click();
  await expect(page.getByText("Goals saved")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("2,500").first()).toBeVisible();
  await noHorizontalOverflow(page);
});

test("data persists across reloads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Trained", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trained", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Trained", exact: true })).toHaveAttribute("aria-pressed", "true");
});
