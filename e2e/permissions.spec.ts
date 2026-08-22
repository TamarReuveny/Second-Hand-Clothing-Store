import { test, expect } from "@playwright/test";
import { signUp, createListingViaUi } from "./helpers";

test.describe("Ownership and authorization", () => {
  test("a listing's own edit page 404s for a different logged-in user", async ({
    page,
  }) => {
    await signUp(page, "Listing Owner");
    const listingId = await createListingViaUi(page, { title: "Owner Only Item" });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Other User");
    const response = await page.goto(`/my-listings/${listingId}/edit`);
    expect(response?.status()).toBe(404);
  });

  test("a non-owner sees Buy/Favorite instead of Edit on someone else's item", async ({
    page,
  }) => {
    await signUp(page, "Item Owner Two");
    const listingId = await createListingViaUi(page, { title: "Not Yours Item" });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Viewer Two");
    await page.goto(`/items/${listingId}`);
    await expect(page.locator("body")).not.toContainText("Edit listing");
    await expect(page.locator('button:has-text("Add to cart")')).toHaveCount(1);
  });

  test("editing a nonexistent listing id shows 404", async ({ page }) => {
    await signUp(page, "Nonexistent Edit User");
    const response = await page.goto(
      "/my-listings/00000000-0000-0000-0000-000000000000/edit",
    );
    expect(response?.status()).toBe(404);
  });

  test("visiting another seller's profile shows only their listings", async ({
    page,
  }) => {
    const stamp = Date.now();
    await signUp(page, "Profile Owner");
    const listingId = await createListingViaUi(page, {
      title: `Profile Item ${stamp}`,
    });

    await page.goto(`/items/${listingId}`);
    await page.click('a[href^="/sellers/"]');
    await page.waitForURL(/\/sellers\/.+/, { timeout: 10000 });

    await expect(page.locator("body")).toContainText(`Profile Item ${stamp}`);
    await expect(page.locator("body")).toContainText("Profile Owner");
  });
});
