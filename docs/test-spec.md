# Test Spec — ReWear

## Approach

Two layers, matching where each kind of bug actually shows up:

- **Unit tests (Vitest)** — pure validation/formatting logic that doesn't
  touch the network: listing field validation, payment-form format
  validation (Luhn, expiry), search synonym resolution. Fast, deterministic,
  no external dependencies.
- **End-to-end tests (Playwright)** — the actual user-facing flows, run
  against a real running instance of the app and the real (shared, non-
  production) Supabase project. This is deliberate: RLS policies, Postgres
  functions, and Server Actions are all part of the app's real behavior,
  and unit-testing them in isolation (with a mocked Supabase client) would
  give false confidence — it would test our mock, not the actual database
  authorization rules. **This is not a hypothetical concern**: the e2e
  suite caught a real RLS policy bug in production (see "Bugs this suite
  actually caught" below) that unit tests with a mocked client never
  would have.

Every e2e test creates its own throwaway account(s) with a unique,
timestamped email, so runs never collide with each other, with a
teammate's run, or with real user data. There is no isolated test
database — see "Known limitations" below.

## Running the tests

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # e2e tests (Playwright) — starts the dev server automatically
```

## Coverage by category (per the assignment's required categories)

**Core features**
- Sign up, log in, log out, session persistence (`e2e/auth.spec.ts`)
- Create a listing with photos, appears in My Listings (`e2e/sell.spec.ts`)
- Edit a listing: field changes, photo add/remove (`e2e/sell.spec.ts`)
- Browse, text search, category-synonym search, category filter
  (`e2e/browse.spec.ts`)
- Full purchase flow: cart → checkout → order created → listing marked
  sold (`e2e/buy.spec.ts`)
- Leaving a seller rating after a completed order (`e2e/buy.spec.ts`)

**Invalid input**
- Missing color, missing photo, negative price on the Sell form
  (`e2e/sell.spec.ts`)
- Wrong password on login; signing up with an already-registered email
  (`e2e/auth.spec.ts`)
- Invalid card number (fails Luhn) rejected client-side at checkout
  (`e2e/buy.spec.ts`, plus unit tests in `card-validation.test.ts`)
- Removing a listing's only photo without adding a replacement
  (`e2e/sell.spec.ts`)
- Malformed listing fields — bad condition/category/price — unit-tested
  directly (`listing-validation.test.ts`)

**Core business flows**
- The buy flow end-to-end, including the side effects: cart is cleared,
  the listing flips to `sold`, an order row is created and appears in
  My Orders (`e2e/buy.spec.ts`)
- A sold listing disappears from the public browse grid
  (`e2e/browse.spec.ts`)

**Permissions**
- Every auth-required route redirects an anonymous visitor to `/login`
  (`e2e/auth.spec.ts`)
- A user cannot edit another user's listing — direct URL access 404s
  (`e2e/permissions.spec.ts`)
- A non-owner sees Buy/Favorite on an item page; only the owner sees Edit
  (`e2e/permissions.spec.ts`)
- You cannot buy your own listing (`e2e/buy.spec.ts`)

**Database**
- Listing creation/edit actually persists photos as separate
  `listing_images` rows with correct `position` ordering, including after
  a remove-and-add edit (verified via both the UI assertions in
  `sell.spec.ts` and, during development, direct queries against the
  `listing_images` table)
- RLS-backed visibility: a buyer can see their purchased (now-sold, no
  longer publicly listed) item; a stranger cannot edit/delete a listing
  they don't own

**Edge cases**
- Card number that's numeric but fails the Luhn checksum
- Expiry date in the past vs. current month vs. future
- Price of exactly 0 (allowed); negative price (rejected)
- Empty/unselected file input on the photo picker
- Searching for a term with no matches at all

**Basic UI**
- Header reflects logged-in/out state correctly after signup and logout
- Filter panel narrows the browse grid to the selected category
- Edit form pre-fills existing listing values correctly

## Bugs this suite actually caught

Writing these tests wasn't just checklist-filling — the e2e suite caught a
real, live bug on the first run: a buyer got a 404 viewing their own
just-purchased item. Root cause: the RLS policy meant to let a buyer see a
listing they've purchased used an unqualified `id` column inside a
correlated subquery over the `orders` table — but `orders` has its own
`id` column, so Postgres resolved the reference to the *inner* table
instead of the intended outer `listings.id`, making the condition
permanently false. The same shadowing bug independently made a check in
the `reviews` insert policy always-true, meaning a review's `seller_id`
was never actually verified against the order's real seller. Both are
fixed in `supabase/migrations/0009_fix_rls_column_shadowing.sql`, with the
root cause documented there for anyone touching RLS policies later.

## Known limitations

- **No isolated test database.** Tests run against the same Supabase
  project as real usage. This was a pragmatic choice given the project's
  scope (no test-environment infrastructure), but it means test runs
  leave behind throwaway accounts/listings in the live database, and a
  test run happening at the exact same time as a real demo could
  theoretically show a stray test listing in the grid. Mitigated by
  unique, obviously-labeled test data and manual cleanup.
- **No component-level UI tests** (e.g. React Testing Library). Given the
  choice between unit-testing component internals and e2e-testing the
  actual rendered flow a user experiences, this project prioritized the
  latter, since it's what actually catches integration bugs like the RLS
  issue above.
- **Payment is simulated.** Checkout format-validates a card number
  client-side (Luhn, expiry) but never transmits or stores it — see
  `docs/security.md`. Tests reflect this: they verify the *validation*
  logic, not real payment processing, because there isn't any.
- **No load/concurrency tests** (e.g. two buyers racing to buy the same
  listing). The `purchase_listing` Postgres function uses `for update` row
  locking specifically to make this safe, but that guarantee isn't
  currently exercised by an automated test — see `docs/scale.md`.
