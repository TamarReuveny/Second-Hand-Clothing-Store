import { test, expect } from "@playwright/test";
import { signUp, fillListingForm, createListingViaUi, TEST_PHOTO } from "./helpers";

test.describe("Creating a listing", () => {
  test("publishes with a photo and appears in My Listings", async ({ page }) => {
    await signUp(page, "Sell Flow User");
    await page.goto("/sell");
    await fillListingForm(page, { title: "E2E Denim Jacket", price: "40", size: "M" });
    await page.click('button:has-text("Publish listing")');

    await page.waitForURL("/my-listings", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("E2E Denim Jacket");
    await expect(page.locator("body")).toContainText("$40");
    await expect(page.locator("body")).toContainText("active");
  });

  test("rejects submission with no color selected", async ({ page }) => {
    await signUp(page, "No Color User");
    await page.goto("/sell");
    await page.locator('input[name="photos"]').setInputFiles(TEST_PHOTO);
    await page.fill("#title", "No Color Item");
    await page.fill("#price", "10");
    await page.fill("#size", "S");
    await page.selectOption("#category", "tops");
    await page.selectOption("#condition", "good");
    // Deliberately skip clicking a color swatch.
    await page.click('button:has-text("Publish listing")');

    await expect(page).toHaveURL(/\/sell/);
    await expect(page.locator("body")).toContainText("Please select a color");
  });

  test("cannot publish without at least one photo", async ({ page }) => {
    await signUp(page, "No Photo User");
    await page.goto("/sell");
    await page.fill("#title", "No Photo Item");
    await page.fill("#price", "10");
    await page.fill("#size", "S");
    await page.selectOption("#category", "tops");
    await page.selectOption("#condition", "good");
    await page.click('button:has-text("Black")');
    await page.click('button:has-text("Publish listing")');

    // The photo <input> is HTML-required with 0 photos, so the browser
    // blocks submission client-side and we never navigate away.
    await expect(page).toHaveURL(/\/sell/);
  });

  test("rejects a negative price", async ({ page }) => {
    await signUp(page, "Negative Price User");
    await page.goto("/sell");
    await page.locator('input[name="photos"]').setInputFiles(TEST_PHOTO);
    await page.fill("#title", "Negative Price Item");
    await page.fill("#price", "-5");
    await page.fill("#size", "S");
    await page.selectOption("#category", "tops");
    await page.selectOption("#condition", "good");
    await page.click('button:has-text("Black")');
    await page.click('button:has-text("Publish listing")');

    // HTML5 min=0 on the price input blocks the browser from submitting.
    await expect(page).toHaveURL(/\/sell/);
  });
});

test.describe("Editing a listing", () => {
  test("edit page pre-fills existing values", async ({ page }) => {
    await signUp(page, "Edit Prefill User");
    await createListingViaUi(page, { title: "Original Prefill Title", price: "15" });
    await page.click('a:has-text("Edit listing")');
    await page.waitForURL(/\/my-listings\/.+\/edit/, { timeout: 10000 });

    await expect(page.locator("#title")).toHaveValue("Original Prefill Title");
    await expect(page.locator("#price")).toHaveValue("15");
  });

  test("saving changes updates the listing", async ({ page }) => {
    await signUp(page, "Edit Save User");
    await createListingViaUi(page, { title: "Before Edit", price: "20" });
    await page.click('a:has-text("Edit listing")');
    await page.waitForURL(/\/my-listings\/.+\/edit/, { timeout: 10000 });

    await page.fill("#title", "After Edit");
    await page.fill("#price", "33");
    await page.click('button:has-text("Save changes")');

    await page.waitForURL("/my-listings", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("After Edit");
    await expect(page.locator("body")).toContainText("$33");
    await expect(page.locator("body")).not.toContainText("Before Edit");
  });

  test("removing the only photo without adding a new one is rejected", async ({
    page,
  }) => {
    await signUp(page, "Edit No Photo User");
    await createListingViaUi(page, { title: "Photo Removal Test" });
    await page.click('a:has-text("Edit listing")');
    await page.waitForURL(/\/my-listings\/.+\/edit/, { timeout: 10000 });

    await page.locator('button[aria-label="Remove photo"]').first().click();
    await page.click('button:has-text("Save changes")');

    await expect(page).toHaveURL(/\/edit/);
    await expect(page.locator("body")).toContainText("A listing needs at least one photo");
  });
});
