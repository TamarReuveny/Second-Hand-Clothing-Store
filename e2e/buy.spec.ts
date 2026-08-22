import { test, expect } from "@playwright/test";
import { signUp, createListingViaUi } from "./helpers";

async function fillValidPayment(page: import("@playwright/test").Page) {
  await page.fill('input[name="name"]', "Test Buyer");
  await page.fill('input[name="phone"]', "5550000000");
  await page.fill('input[name="address"]', "123 Test St, Testville");
  await page
    .locator('input[placeholder="4242 4242 4242 4242"]')
    .fill("4242424242424242");
  await page.locator('input[placeholder="MM/YY"]').fill("12/30");
  await page.locator('input[placeholder="123"]').fill("123");
}

test.describe("Buying an item", () => {
  test("full happy path: cart -> checkout -> order created, listing sold", async ({
    page,
  }) => {
    const stamp = Date.now();
    const title = `Buy Flow Item ${stamp}`;

    await signUp(page, "Buy Flow Seller");
    const listingId = await createListingViaUi(page, { title, price: "42" });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Buy Flow Buyer");
    await page.goto(`/items/${listingId}`);
    await page.click('button:has-text("Add to cart")');
    await expect(page.locator("body")).toContainText("View cart");

    await page.goto("/cart");
    await expect(page.locator("body")).toContainText(title);
    await expect(page.locator("body")).toContainText("$42");

    await page.click('a:has-text("Proceed to checkout")');
    await page.waitForURL("/checkout", { timeout: 10000 });
    await fillValidPayment(page);
    await page.click('button:has-text("Pay")');

    await page.waitForURL("/my-orders", { timeout: 15000 });
    await expect(page.locator("body")).toContainText(title);

    // Listing should now show as sold and no longer be purchasable.
    await page.goto(`/items/${listingId}`);
    await expect(page.locator("body")).toContainText("Sold");
  });

  test("cannot buy your own listing", async ({ page }) => {
    await signUp(page, "Self Buy Test User");
    const listingId = await createListingViaUi(page, { title: "Own Item Test" });

    await page.goto(`/items/${listingId}`);
    await expect(page.locator("body")).toContainText("This is your own listing");
    await expect(page.locator('button:has-text("Add to cart")')).toHaveCount(0);
  });

  test("checkout rejects an invalid card number client-side", async ({
    page,
  }) => {
    await signUp(page, "Bad Card Seller");
    const listingId = await createListingViaUi(page, { title: "Bad Card Item" });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Bad Card Buyer");
    await page.goto(`/items/${listingId}`);
    await page.click('button:has-text("Add to cart")');
    await page.goto("/checkout");

    await page.fill('input[name="name"]', "Test Buyer");
    await page.fill('input[name="phone"]', "5550000000");
    await page.fill('input[name="address"]', "123 Test St");
    await page
      .locator('input[placeholder="4242 4242 4242 4242"]')
      .fill("1234567890123456"); // fails Luhn
    await page.locator('input[placeholder="MM/YY"]').fill("12/30");
    await page.locator('input[placeholder="123"]').fill("123");
    await page.click('button:has-text("Pay")');

    // Should stay on /checkout with a client-side validation error.
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator("body")).toContainText(/invalid card/i);
  });

  test("removing an item from the cart works", async ({ page }) => {
    await signUp(page, "Cart Remove Seller");
    const listingId = await createListingViaUi(page, { title: "Cart Remove Item" });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Cart Remove Buyer");
    await page.goto(`/items/${listingId}`);
    await page.click('button:has-text("Add to cart")');
    await page.goto("/cart");
    await expect(page.locator("body")).toContainText("Cart Remove Item");

    await page.click('button:has-text("Remove")');
    await expect(page.locator("body")).toContainText("Your cart is empty");
  });

  test("buyer can rate the seller after a completed order", async ({ page }) => {
    await signUp(page, "Rating Flow Seller");
    const listingId = await createListingViaUi(page, { title: "Rating Flow Item" });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await signUp(page, "Rating Flow Buyer");
    await page.goto(`/items/${listingId}`);
    await page.click('button:has-text("Add to cart")');
    await page.goto("/checkout");
    await fillValidPayment(page);
    await page.click('button:has-text("Pay")');
    await page.waitForURL("/my-orders", { timeout: 15000 });

    await page.click('button[aria-label="Rate 5 stars"]');
    await expect(page.locator("body")).toContainText("Thanks for rating!");
  });
});
