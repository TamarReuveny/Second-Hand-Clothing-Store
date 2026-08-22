# Security — ReWear

Companion to `docs/technical-design.md`. Covers authentication, authorization,
input validation, API protection, secrets handling, and known gaps.

## Authentication

Handled entirely by **Supabase Auth** (email + password) — no custom auth
code, password hashing, or session logic was written by hand.

- Sign up / log in run **client-side** against `supabase.auth.signUp()` /
  `signInWithPassword()` using the browser Supabase client, which stores the
  session as an HTTP cookie (via `@supabase/ssr`).
- `src/proxy.ts` (Next.js middleware) runs on every request and refreshes
  that session cookie, so Server Components always see an up-to-date auth
  state without the client needing to do anything.
- A Postgres trigger (`handle_new_user`) auto-creates a `profiles` row on
  signup, so the rest of the schema references a normal foreign key
  instead of reaching into Supabase's internal `auth.users` table.
- Passwords are never touched by our code — Supabase hashes and stores
  them. Minimum length is Supabase's default (6 characters); see
  "Known gaps" below.

## Authorization

**The real enforcement boundary is Postgres Row Level Security (RLS), not
application code.** Every table has RLS enabled, and the Supabase client
— both server- and client-side — only ever uses the public **anon key**,
which has zero inherent privileges. What a request can read or write is
entirely determined by the RLS policies evaluated against the caller's
JWT (`auth.uid()`).

App-level checks (`if (!user) redirect("/login")` in Server Actions and
pages) exist too, but they're a UX convenience, not the security
boundary — if they were removed or buggy, RLS still blocks the
unauthorized read/write. This two-layer approach is deliberate: it means
a bug in a page's `if` check is a bug, not a data breach.

**Operations that require being logged in**: selling, editing/deleting
your own listings, adding to cart, checking out, favoriting, viewing your
orders/listings/favorites/cart. Every one of these routes/actions redirects
an anonymous user to `/login` (verified by `e2e/auth.spec.ts`).

**How access to other users' data is prevented** (RLS summary — full
policies in `supabase/migrations/`):

| Table | Who can read | Who can write |
|---|---|---|
| `listings` | Anyone, if `active`; the seller always; a buyer/favoriter for that specific listing even after it's sold | Only the seller (insert/update/delete) |
| `listing_images` | Same visibility as the parent listing | Only the parent listing's seller |
| `orders` | Only the buyer or seller on that order | Never directly — only via `purchase_listing()` (see below) |
| `cart_items`, `favorites` | Only the owning user | Only the owning user |
| `reviews` | Anyone (needed for public seller ratings) | Only the actual buyer on that specific order, and only if the submitted `seller_id` matches the order's real seller |
| `profiles` | Anyone (display name is public) | Only your own row |

Purchases don't go through a plain `INSERT` policy at all — `orders` has
no insert policy. The only way an order can be created is the
`purchase_listing(listing_id)` Postgres function (`security definer`,
called via RPC), which atomically checks the listing is still active,
rejects buying your own listing, row-locks it (`for update`) to prevent
two buyers racing for the same item, marks it sold, and inserts the order
— all in one transaction. This closes off an entire class of bugs (e.g. a
buggy client submitting a fake price, or two checkouts double-selling the
same item) by making the write path a single, narrow, server-enforced
operation instead of a generic insert.

A real bug in this layer was caught by the test suite and fixed in
production — see `docs/test-spec.md` ("Bugs this suite actually caught")
and `supabase/migrations/0009_fix_rls_column_shadowing.sql`: a column-name
shadowing bug in a correlated RLS subquery silently made a buyer unable to
view their own purchased item, and separately made the reviews policy's
seller-match check always pass. Both are the kind of RLS logic bug that's
easy to write and easy to miss without testing against the real database
(a mocked-client unit test would never have caught it).

## Input validation

- **Listing fields** (`src/lib/listing-validation.ts`): title/size/color
  required, price must be a non-negative finite number, condition/category
  must be one of a fixed allowed set (rejects anything else, not just
  trusts the `<select>` client sent something valid).
- **Photos**: must be an actual `image/*` MIME type, capped at 5MB each,
  max 6 per listing — enforced server-side in the Server Action, not just
  via the `accept="image/*"` attribute on the file input (which a user can
  trivially bypass). See "Known gaps" for the limit of MIME-type checking.
- **Payment form** (`src/lib/card-validation.ts`): card number format +
  Luhn checksum, expiry must be a real, non-past month/year, CVV 3–4
  digits. This is real validation logic with real unit tests, but see
  below — it's validating a *simulated* payment, not a live one.
- **Database constraints as a second layer**: even if a Server Action's
  validation were buggy, Postgres `check` constraints on `listings.price
  >= 0`, `orders.buyer_id <> seller_id`, `reviews.rating between 1 and 5`,
  and the RLS write policies above provide defense in depth.

## Protecting API calls (Server Actions)

There's no hand-written REST API — every write goes through a Next.js
Server Action, which gets a few protections for free:

- **CSRF**: Server Actions only accept requests whose `Origin` header
  matches the app's own origin (no `experimental.serverActions.
  allowedOrigins` is configured, so this defaults to same-origin-only —
  a cross-site form can't invoke `createListing` or `completeCheckout`).
- **Body size limit**: capped at 8MB (`next.config.ts`) to keep the
  photo-upload path from accepting arbitrarily large request bodies.
- Every action re-derives the caller's identity server-side via
  `supabase.auth.getUser()` — it never trusts a user id passed in from
  the client, because the RLS layer wouldn't accept a mismatched one
  anyway.

## Secrets

- The app only ever holds the **publishable/anon key**
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — safe by design to expose in
  client-side code, since it carries no privilege beyond what RLS grants
  whoever is authenticated.
- The `service_role` key (which bypasses RLS entirely) and the database
  password have never been given to or used by any tooling in this
  project — confirmed by grep, not just habit.
- `.env.local` is gitignored (`.env*` in `.gitignore`) and confirmed via
  `git ls-files` to never have been committed.
- Production secrets live in Vercel's environment variable settings, not
  in the repo.

## Known risks and what would be improved

- **Checkout is simulated, not real payment processing.** Card details
  are format-validated client-side (Luhn, expiry) but the input fields
  have no `name` attribute and are never included in the `FormData` sent
  to `completeCheckout` — no card data is transmitted to or stored by our
  server at all. This is a deliberate simplification for the scope of a
  class project, not an oversight, but it's worth stating plainly: this
  is not PCI-relevant because it never handles real payment data. A real
  version would integrate a processor like Stripe and never touch raw
  card numbers server-side either.
- **Photo validation trusts the browser-reported MIME type.** A
  determined attacker could relabel a non-image file with an `image/*`
  content type and get it into Storage. Low impact here (Storage doesn't
  execute uploaded files, and the bucket only serves them as static
  assets), but a production version should sniff actual file signatures
  server-side rather than trusting `file.type`.
- **Search input goes into a PostgREST `.or()` filter string
  (`title.ilike.%${q}%,...`) without escaping commas or PostgREST
  special characters.** Not classic SQL injection (PostgREST parses this
  as a structured filter, not raw SQL), but a search term containing a
  comma or parenthesis could produce a malformed filter and an
  unexpected error rather than a clean "no results." Worth sanitizing or
  using a parameterized `.textSearch()` instead.
- **No rate limiting** on signup, login, or listing creation beyond
  Supabase Auth's own built-in defaults — a scripted account-creation or
  spam-listing attack isn't specifically defended against at the app
  layer.
- **Password minimum is Supabase's default (6 characters)**, no
  complexity requirement. Fine for a class project; a real product would
  want a stronger policy or a breached-password check.
- **No email verification required** in the current Supabase project
  config (disabled for frictionless local testing during development —
  see README). A production deployment should turn "Confirm email" back
  on, which closes off signing up with an email you don't own.
