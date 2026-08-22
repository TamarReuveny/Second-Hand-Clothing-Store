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
  const url = page.url();
  await page.click(`a:has-text("View")`);
  await page.waitForURL(/\/items\/.+/, { timeout: 10000 });
  const match = page.url().match(/\/items\/([^/?]+)/);
  if (!match) throw new Error("Could not determine created listing id");
  return match[1];
}
