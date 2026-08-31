import type { Page } from "@playwright/test";
import path from "path";

// These tests run against the real (shared, non-production) Supabase
// project — there is no isolated test database. Every test creates its
// own throwaway account with a unique email so runs never collide with
// each other or with real user data. See docs/test-spec.md.
export const TEST_PASSWORD = "TestPass123!";
export const TEST_PHOTO = path.resolve(__dirname, "fixtures/test-photo.png");

export function uniqueEmail(label: string): string {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `tamar1308+e2e${label}${stamp}@gmail.com`;
}

export async function signUp(
  page: Page,
  displayName: string,
): Promise<{ email: string; displayName: string }> {
  const email = uniqueEmail(displayName.replace(/\s+/g, "").toLowerCase());
  await page.goto("/signup");
  await page.fill("#displayName", displayName);
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button:has-text("Sign up")');
  await page.waitForURL("/", { timeout: 15000 });
  return { email, displayName };
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button:has-text("Log in")');
  await page.waitForURL("/", { timeout: 15000 });
}

type ListingOptions = {
  title: string;
  description?: string;
  price?: string;
  size?: string;
  color?: string;
  category?: string;
  condition?: string;
  photo?: string;
};

/** Fills and submits the Sell form. Assumes the page is already on /sell. */
export async function fillListingForm(page: Page, opts: ListingOptions) {
  await page
    .locator('input[name="photos"]')
    .setInputFiles(opts.photo ?? TEST_PHOTO);
  await page.fill("#title", opts.title);
  if (opts.description) await page.fill("#description", opts.description);
  await page.fill("#price", opts.price ?? "25");
  await page.fill("#size", opts.size ?? "M");
  await page.selectOption("#category", opts.category ?? "tops");
  await page.selectOption("#condition", opts.condition ?? "good");
  await page.click(`button:has-text("${opts.color ?? "Black"}")`);
}

export async function createListingViaUi(
  page: Page,
  opts: ListingOptions,
): Promise<string> {
  await page.goto("/sell");
  await fillListingForm(page, opts);
  await page.click('button:has-text("Publish listing")');
  await page.waitForURL("/my-listings", { timeout: 15000 });
  await page.click(`a:has-text("View")`);
  await page.waitForURL(/\/items\/.+/, { timeout: 10000 });
  const match = page.url().match(/\/items\/([^/?]+)/);
  if (!match) throw new Error("Could not determine created listing id");
  return match[1];
}

/** Adds a listing to the current (logged-in) user's cart and completes
 * checkout with a valid-looking test card, marking the listing sold. */
export async function buyListingAsCurrentUser(page: Page, listingId: string) {
  await page.goto(`/items/${listingId}`);
  await page.click('button:has-text("Add to cart")');
  await page.goto("/checkout");
  await page.fill('input[name="name"]', "Test Buyer");
  await page.fill('input[name="phone"]', "5550000000");
  await page.fill('input[name="address"]', "123 Test St, Testville");
  await page
    .locator('input[placeholder="4242 4242 4242 4242"]')
    .fill("4242424242424242");
  await page.locator('input[placeholder="MM/YY"]').fill("12/30");
  await page.locator('input[placeholder="123"]').fill("123");
  await page.click('button:has-text("Pay")');
  await page.waitForURL("/my-orders", { timeout: 15000 });
}

/** Buys a listing as a brand-new second account in a fully isolated
 * browser context (separate cookie jar), so the original page's
 * (seller's) session is left untouched — a same-context `newPage()`
 * would share cookies and silently log the seller's page out too.
 * Useful for "listing becomes sold, then check back as the seller"
 * scenarios. */
export async function buyListingAsNewAccountInNewTab(
  page: Page,
  listingId: string,
) {
  const browser = page.context().browser();
  if (!browser) {
    throw new Error("No browser available to open an isolated context");
  }
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await signUp(buyerPage, "Sold Item Buyer");
  await buyListingAsCurrentUser(buyerPage, listingId);
  await buyerContext.close();
}
