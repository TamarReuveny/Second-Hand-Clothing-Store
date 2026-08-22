import { test, expect } from "@playwright/test";
import { signUp, createListingViaUi } from "./helpers";

test.describe("Search and filters", () => {
  test("search by title finds a matching listing", async ({ page }) => {
    const stamp = Date.now();
    const title = `Unique Search Target ${stamp}`;
    await signUp(page, "Search Test User");
    await createListingViaUi(page, { title });

    await page.goto("/");
    await page.fill('input[placeholder*="Search" i]', title);
    await page.keyboard.press("Enter");

    await expect(page.locator("body")).toContainText(title);
  });

  test("search finds nothing for a nonsense query", async ({ page }) => {
    await page.goto("/?q=zzznonexistentqueryzzz12345");
    await expect(page.locator("body")).toContainText(/no items match|no listings/i);
  });

  test("category synonym search resolves correctly", async ({ page }) => {
    const stamp = Date.now();
    const title = `Synonym Jeans Test ${stamp}`;
    await signUp(page, "Synonym Test User");
    // "bottoms" category, searched for via the "jeans" synonym.
    await createListingViaUi(page, { title, category: "bottoms" });

    await page.goto("/?q=jeans");
    await expect(page.locator("body")).toContainText(title);
  });

  test("category filter narrows results to the selected category", async ({
    page,
  }) => {
    const stamp = Date.now();
    const shoesTitle = `Filter Shoes Test ${stamp}`;
    const topsTitle = `Filter Tops Test ${stamp}`;
    await signUp(page, "Filter Test User");
    await createListingViaUi(page, { title: shoesTitle, category: "shoes" });
    await createListingViaUi(page, { title: topsTitle, category: "tops" });

    await page.goto("/");
    await page.click('button:has-text("Filter")');
    // Category chips apply immediately on click (no separate Apply step —
    // that's only needed for the price range inputs).
    await page.click('button:has-text("Shoes")');
    await page.waitForURL(/category=shoes/, { timeout: 10000 });

    await expect(page.locator("body")).toContainText(shoesTitle);
    await expect(page.locator("body")).not.toContainText(topsTitle);
  });

  test("sold items do not appear in the browse grid", async ({ page }) => {
    const stamp = Date.now();
    const title = `Should Not Appear ${stamp}`;
    await signUp(page, "Hidden Sold User");
    const listingId = await createListingViaUi(page, { title });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Buyer For Hidden Test");
    await page.goto(`/items/${listingId}`);
    await page.click('button:has-text("Add to cart")');
    await page.goto("/checkout");
    await page.fill('input[name="name"]', "Test Buyer");
    await page.fill('input[name="phone"]', "5550000000");
    await page.fill('input[name="address"]', "123 Test St");
    await page.locator('input[placeholder="4242 4242 4242 4242"]').fill("4242424242424242");
    await page.locator('input[placeholder="MM/YY"]').fill("12/30");
    await page.locator('input[placeholder="123"]').fill("123");
    await page.click('button:has-text("Pay")');
    await page.waitForURL("/my-orders", { timeout: 15000 });

    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(title);
  });
});
