# Technical Design — ReWear

Companion to `docs/product-spec.md`. Describes how the product spec is actually
implemented: architecture, database schema, server actions/API surface, and
data flow through the key user journeys.

## Architecture overview

```
Browser
  │
  │  HTTPS
  ▼
Next.js 16 (App Router) — deployed on Vercel
  ├─ Server Components (pages) ──── read data directly via Supabase server client
  ├─ Server Actions ──────────────  all writes (create/update/delete) go through these
  ├─ Client Components ──────────── forms, filters, favorite/cart buttons (interactivity)
  └─ proxy.ts (middleware) ──────── refreshes the Supabase auth session cookie per request
  │
  │  Supabase client libraries (anon key, RLS-scoped)
  ▼
Supabase
  ├─ Postgres — tables + Row Level Security policies + 2 SQL functions
  ├─ Auth — email/password, issues JWT sessions stored in cookies
  └─ Storage — public bucket for listing photos
```

There is no separate backend/API server. Next.js Server Components query
Supabase directly at request time (server-side, using the request's auth
cookie), and all mutations go through **Server Actions** — async functions
marked `"use server"` that run on the server but are called like normal
functions from client components via `<form action={...}>`. This means:

- No hand-written REST/GraphQL API layer — the Server Action *is* the API.
- Every read and write is authorized twice: once by our own `if (!user)`
  checks in the action/page, and again by Postgres Row Level Security,
  which is the real security boundary (see `docs/security.md`).
- The **anon key** is the only Supabase credential the app ever uses
  client-side or server-side; it has no special privileges — access is
  entirely governed by RLS policies tied to the caller's JWT.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email + password) |
| File storage | Supabase Storage |
| Hosting | Vercel |
| Testing (planned) | Vitest (unit), Playwright (e2e) |

## Database schema

All tables live in the `public` schema. `auth.users` is managed by Supabase
Auth; `profiles` mirrors it 1:1 via a trigger so the rest of the schema can
reference a normal foreign key instead of reaching into `auth`.

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Public-facing user record, 1:1 with `auth.users` | `id` (= auth user id), `display_name` |
| `listings` | An item for sale | `seller_id`, `title`, `description`, `price`, `size`, `condition`, `category`, `color`, `status` (`active`/`sold`) |
| `listing_images` | Photos for a listing (one-to-many) | `listing_id`, `image_path`, `position` (0 = cover photo) |
| `orders` | A completed purchase | `listing_id`, `buyer_id`, `seller_id`, `price`, `listing_title`/`listing_size` (snapshot) |
| `cart_items` | Items a buyer has queued for checkout | `user_id`, `listing_id` (unique together) |
| `favorites` | Saved/liked listings | `user_id`, `listing_id` (unique together) |
| `reviews` | 1–5 star seller rating, one per order | `order_id` (unique), `reviewer_id`, `seller_id`, `rating` |

**Why a separate `listing_images` table instead of an array/JSON column?**
A listing can have 0–6 photos, each independently addable/removable, and the
first (`position = 0`) is used everywhere as the cover thumbnail. A proper
one-to-many table with an index on `listing_id` keeps that query fast and
lets each photo carry its own storage path and position, which a JSON blob
would make harder to update atomically (e.g. deleting one photo without
rewriting the whole array).

**Why snapshot `listing_title`/`listing_size` on `orders`?**
`orders.listing_id` still points at the original listing, but a seller can
delete a listing after it's sold. Without a snapshot, a buyer's order
history would show "Listing removed" for anything the seller cleaned up.

### Postgres functions

- **`handle_new_user()`** — trigger on `auth.users` insert; creates the
  matching `profiles` row automatically on signup.
- **`purchase_listing(listing_id)`** — `security definer` RPC that
  atomically marks a listing `sold` and inserts the `orders` row (with
  price/title/size snapshot) in one transaction, with `for update` row
  locking so two buyers can't both "win" the same listing in a race. Also
  rejects buying your own listing. This is the only way `orders` rows are
  ever created — there's no direct insert policy on `orders`.

### Row Level Security

RLS is enabled on every table; the anon/authenticated Supabase client can
only do what a policy explicitly allows. Summarized:

- **`listings`**: publicly readable when `active`; a seller can always read/
  update/delete their own; a buyer can read a listing they've purchased or
  favorited even after it's no longer active (so order history and saved
  items don't break).
- **`listing_images`**: readable wherever the parent listing is readable
  (mirrors the above); insert/delete only if you own the parent listing.
- **`cart_items`, `favorites`**: a user can only see/insert/delete their own.
- **`reviews`**: publicly readable (so average ratings can be shown to
  everyone); insert only allowed if the reviewer is the actual buyer on
  that specific order (`orders.buyer_id = auth.uid()`), preventing fake
  reviews for orders that aren't yours.
- **`orders`**: readable only by the buyer or seller involved; no direct
  write policy — all writes go through `purchase_listing()`.

Full DDL and policy definitions: `supabase/migrations/` (numbered, run in
order — see README for setup).

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Browse/search/filter/sort active listings |
| `/items/[id]` | public | Item detail, photo gallery, buy/edit/favorite |
| `/sellers/[id]` | public | Seller profile: rating, sales count, active listings |
| `/sell` | auth required | Create a listing |
| `/my-listings` | auth required | Manage your own listings |
| `/my-listings/[id]/edit` | auth required, owner only | Edit a listing |
| `/cart` | auth required | Review cart before checkout |
| `/checkout` | auth required | Contact + payment form (simulated, see below), completes purchase |
| `/my-orders` | auth required | Purchase history, leave seller ratings |
| `/my-favorites` | auth required | Saved listings |
| `/login`, `/signup` | public | Auth forms |

## Server actions

All in `src/app/actions/`, one file per domain:

| Action | File | Does |
|---|---|---|
| `createListing`, `updateListing`, `deleteListing` | `listings.ts` | Full listing lifecycle, incl. multi-photo upload/removal |
| `signOut` | `auth.ts` | Ends the session |
| `addToCart`, `removeFromCart` | `cart.ts` | Cart management |
| `completeCheckout` | `orders.ts` | Calls `purchase_listing` for every cart item, clears the cart |
| `submitReview` | `reviews.ts` | 1–5 star rating on a completed order |
| `toggleFavorite` | `favorites.ts` | Save or unsave a listing for the current user |

Sign-in and sign-up run client-side against `supabase.auth` directly (not a
server action) since they need to set the session in the browser's cookie
jar via the Supabase browser client.

## Key data flows

**Sign up** → Supabase Auth creates the `auth.users` row → `handle_new_user`
trigger creates the matching `profiles` row → browser client stores the
session cookie → `proxy.ts` refreshes that cookie on every subsequent
request so server-rendered pages see the logged-in user.

**Sell an item** → `SellForm` (client component) collects fields + up to 6
photos in local state, keeping the real `<input type=file>` in sync via
`DataTransfer` so removing a photo from the preview grid actually removes it
from what gets submitted → `createListing` server action validates, uploads
each photo to Supabase Storage, inserts the `listings` row, then inserts one
`listing_images` row per photo with sequential `position`.

**Buy** → add to cart → `/checkout` collects contact + card details
(client-side format/Luhn validation only — **no card data is ever sent to
the server**, this is a simulated payment for the class project, not a real
payment integration) → `completeCheckout` calls `purchase_listing()` once
per cart item → cart is cleared → redirect to `/my-orders`.

**Browse/search/filter** → all server-side in `page.tsx`: text search
(with a small synonym map, e.g. "jeans" → `bottoms`), category/condition/
size/color/rating filters, and sort all become Supabase query clauses in a
single request — no client-side filtering of a full dataset.

## Project structure

```
src/
├─ app/                 # pages and routes (App Router, one folder per route)
│  ├─ actions/          # server actions, one file per domain (see below)
│  ├─ items/[id]/       # item detail page
│  ├─ sellers/[id]/     # seller profile page
│  ├─ my-listings/[id]/edit/
│  └─ ...                # sell, cart, checkout, my-orders, my-favorites, login, signup
├─ components/          # shared UI components (client components + presentational pieces)
├─ lib/
│  ├─ supabase/         # server/browser Supabase client setup, DB types, storage helpers
│  ├─ listing-validation.ts
│  └─ card-validation.ts
supabase/migrations/    # numbered SQL migrations (schema + RLS), run in order
e2e/                    # Playwright end-to-end tests
```

Each route folder holds its own `page.tsx` (a Server Component that fetches
data) plus any route-specific pieces; anything reused across routes lives in
`src/components/`.

## Component structure

Most components are small and single-purpose, split along a clear line:
Server Components fetch and render data, Client Components own local
interaction state. Key client components:

| Component | Owns |
|---|---|
| `SellForm` | Multi-field listing form + up to 6 photos in local state, kept in sync with the real `<input type=file>` via `DataTransfer` |
| `CheckoutForm` | Card fields, client-side format validation, wraps `completeCheckout` via `useActionState` |
| `FiltersBar` | Category/condition/size/color/rating/price filter state, syncs to the URL's query string |
| `AddToCartButton`, `FavoriteButton` | Optimistic local toggle state + pending flag around their server action call |
| `RateOrder` | 1–5 star rating input + submission state for `submitReview` |
| `PhotoGallery` | Selected-photo index for the item detail page's image viewer |

Everything else (`ItemCard`, `Header`, `SearchInput`, `Logo`) is presentational
or thin state (e.g. a debounced search input).

## State management

There's no global state library (Redux, Zustand, Context) — deliberately.
State is kept at the smallest scope that needs it:

- **Server state** (listings, orders, favorites, etc.) lives in Postgres and
  is read fresh on every navigation via Server Components — there's no
  client-side cache to keep in sync, so "stale data" isn't a class of bug
  this app has.
- **Local UI state** (form fields, "is this photo picker open," a pending
  spinner) is plain `useState` inside the component that owns it, e.g.
  `SellForm`'s photo list or `CheckoutForm`'s card fields.
- **Server Action result state** uses React's `useActionState` (e.g.
  `CheckoutForm`) so the pending/error/success state returned by a Server
  Action flows straight into the component without a manual fetch+setState
  dance.
- **Shared "did this just change" state across components on the same page**
  (e.g. favorite/cart button reflecting a toggle) uses `useTransition` plus
  a local optimistic flag, then relies on the next Server Component render
  (via `router.refresh()` or navigation) to reconcile with the real DB state
  rather than hand-rolling a client store.
- **Filter/search state** lives in the URL's query string (`FiltersBar`),
  not in React state that would be lost on refresh or unshareable via link.

## Error handling

- **Server Actions never throw across the client/server boundary** for
  expected failures (validation errors, "listing not found," Supabase
  errors) — they catch the failure and `return { error: "..." }`, a plain
  object the calling component reads and renders inline (see
  `src/app/actions/*.ts`). This is deliberate: an uncaught throw in a
  Server Action produces a generic Next.js error screen with no actionable
  message, whereas a returned `{ error }` lets the form show exactly what
  went wrong (e.g. "Sold listings can't be edited.") next to the field that
  caused it.
- **Client-side format errors** (e.g. an invalid card number) are caught
  before the Server Action is even called, so the user sees feedback
  instantly rather than waiting on a round trip.
- **Postgres is the last line of defense.** `check` constraints
  (`listings.price >= 0`, `reviews.rating between 1 and 5`, etc.) and RLS
  policies reject anything that slips past both the client and the Server
  Action's own validation, and that rejection surfaces back through the
  same `{ error }` path — see `docs/security.md` for the full list.
- **Unexpected/unowned errors** (network failure, Supabase outage) fall
  through to Next.js's default error boundaries rather than a custom
  global handler — an acceptable simplification at this project's scope.

## Input validation

Validation happens at three layers, from least to most trusted (full detail
in `docs/security.md`):

1. **Client-side** — HTML attributes (`required`, `type=file accept=image/*`)
   plus JS checks (`src/lib/card-validation.ts` for the payment form) give
   immediate feedback but are trivially bypassable.
2. **Server Action** — `src/lib/listing-validation.ts` re-checks every field
   server-side (required fields, non-negative price, condition/category
   from a fixed allowed set) before touching the database, plus
   server-side photo MIME-type/size/count checks.
3. **Database constraints + RLS** — the non-bypassable layer; see
   `docs/security.md`.

## Key user-experience decisions

- **Optimistic-feeling actions, not optimistic UI.** Favorite/cart toggles
  show a pending state immediately but wait for the Server Action's actual
  result before flipping the UI, so a failed request never leaves the
  button showing a lie.
- **Sold is a terminal, read-only state everywhere.** Once a listing is
  sold, Edit/Delete are hidden in My Listings and the edit page itself
  redirects away if visited directly — the UI never lets a user attempt an
  action the backend would reject anyway (see the "Bugs this suite
  actually caught" note in `docs/test-spec.md` for why this matters).
- **Filters live in the URL** so a filtered view is shareable/bookmarkable
  and survives a page refresh.
- **Errors render next to the action that caused them** (inline on the
  form/button), not as a global toast, since every mutation in this app is
  scoped to a single, visible piece of UI.

## Known simplifications (see `docs/security.md` and `docs/scale.md`)

- Checkout is a UI simulation — no real payment processor is integrated.
- No pagination yet on the browse grid or listing queries.
- Automated tests are implemented: Vitest unit tests for validation logic
  and Playwright e2e tests for the core user flows (see `docs/test-spec.md`).
