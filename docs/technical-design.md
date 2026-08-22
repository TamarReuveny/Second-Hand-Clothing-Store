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

## Known simplifications (see `docs/security.md` and `docs/scale.md`)

- Checkout is a UI simulation — no real payment processor is integrated.
- No pagination yet on the browse grid or listing queries.
- No automated tests yet (planned: Vitest for actions, Playwright for the
  core user flows).
