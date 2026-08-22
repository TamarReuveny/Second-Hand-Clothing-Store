import { test, expect } from "@playwright/test";
import { signUp, login, uniqueEmail, TEST_PASSWORD } from "./helpers";

test.describe("Authentication", () => {
  test("sign up creates an account and logs the user in", async ({ page }) => {
    const { displayName } = await signUp(page, "Auth Test User");
    await expect(page.locator("header")).toContainText(displayName);
    await expect(page.locator("header")).toContainText("Log out");
  });

  test("log out clears the session", async ({ page }) => {
    await signUp(page, "Logout Test User");
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page.locator("header")).toContainText("Log in");
    await expect(page.locator("header")).not.toContainText("Log out");
  });

  test("logging back in with the right password works", async ({ page }) => {
    const { email, displayName } = await signUp(page, "Relogin Test User");
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });
    await login(page, email);
    await expect(page.locator("header")).toContainText(displayName);
  });

  test("logging in with a wrong password shows an error, not a crash", async ({
    page,
  }) => {
    const { email } = await signUp(page, "Wrong Password User");
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", "TotallyWrongPassword1!");
    await page.click('button:has-text("Log in")');

    // Should stay on /login with a visible error, not navigate away or crash.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText(/invalid|incorrect|error/i);
  });

  test("signing up with an already-registered email shows an error", async ({
    page,
  }) => {
    const email = uniqueEmail("dupe");
    await page.goto("/signup");
    await page.fill("#displayName", "First Signup");
    await page.fill("#email", email);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button:has-text("Sign up")');
    await page.waitForURL("/", { timeout: 15000 });
    await page.click('button:has-text("Log out")');
    await page.waitForURL("/", { timeout: 10000 });

    await page.goto("/signup");
    await page.fill("#displayName", "Second Signup");
    await page.fill("#email", email);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button:has-text("Sign up")');

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator("body")).toContainText(/already|registered|exists/i);
  });
});

test.describe("Protected routes redirect anonymous users to /login", () => {
  for (const route of [
    "/sell",
    "/my-listings",
    "/my-orders",
    "/my-favorites",
    "/cart",
    "/checkout",
  ]) {
    test(`${route} redirects when logged out`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
