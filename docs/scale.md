# Scale — ReWear

Companion to `docs/technical-design.md`. Honest assessment of what holds up
and what doesn't as usage grows, based on the actual current implementation
— not a hypothetical rewrite.

## At tens/hundreds of users (current expected scale)

This is fine as-is. Every page is a Next.js Server Component that queries
Supabase directly per request — no caching layer, no queue, no background
jobs. At this scale that's a feature, not a gap: fewer moving parts, data
is always fresh, and Supabase's Postgres instance (even on the free tier)
handles this query volume without difficulty. The things below matter once
listing/user counts grow into the thousands, not before.

## Queries that would get slow first

**1. The seller-rating filter on the browse page is the single biggest hot
spot.** In `src/app/page.tsx`, filtering by minimum seller rating does:

```ts
const { data: allReviews } = await supabase.from("reviews").select("seller_id, rating");
```

— an unfiltered, unpaginated fetch of **every review in the database**,
then aggregates them in JavaScript to find qualifying sellers. This is
correct today because `reviews` is small, but it's a full-table read on
every single browse request that uses the rating filter, and it gets
linearly worse as reviews accumulate. Fix: a Postgres view or a
materialized `seller_ratings(seller_id, avg_rating, review_count)` table
kept in sync by a trigger, queried directly instead of aggregated in app
code.

**2. The item detail page makes 5–6 sequential queries** (listing → seller
profile → seller reviews → cart status → favorite status → images), each
`await`-ed one after another rather than run concurrently. None of these
depend on each other's *results* (they all just depend on `listing.id` or
`listing.seller_id`, known immediately), so they could run in parallel via
`Promise.all` and cut the page's data-fetching latency roughly in half.
Not urgent at current load, but the easiest concrete win here.

**3. Missing indexes for filter/sort columns actually in use.** Current
indexes cover `seller_id`, `status`, and `category` on `listings`, plus
the foreign-key columns on the join tables. But the browse page's filter
bar also filters by `condition`, `size`, and `color`, and sorts by
`price` — none of which are indexed. Fine at hundreds of rows (Postgres
just sequential-scans a small table faster than using an index anyway);
would start to matter once listings reach the thousands. A composite
index on `(status, category)` would also help the single most common
query (active listings in a category) more than the two separate
single-column indexes currently do.

**4. `orders.listing_id` has no index.** It's now queried on every single
item-detail-page and listing-image load, via the RLS policies added in
`0005`/`0009` (`exists (select 1 from orders where listing_id = ... and
buyer_id = auth.uid())`) — this runs on *every* listing read, not just
order-related pages, since it's baked into the RLS policy itself. Worth
adding before `orders` grows large, since it's now on a very hot path.

## No pagination anywhere

The browse grid, My Listings, My Orders, My Favorites, the seller profile
page, and the cart all fetch their *entire* result set with no `.range()`
or `.limit()`. At current data volumes this is invisible; once a seller
has hundreds of listings or a buyer has hundreds of orders, these pages
will fetch and render everything at once. This is the most significant
concrete limitation in the current implementation and the first thing a
"v2" should add — Supabase's `.range(from, to)` makes this a small,
mechanical change per query, but it touches every listing page, so it's
sized as its own follow-up rather than something to bolt on quietly.

## Avoiding over-fetching

Where this *is* handled well: cover-image lookups for grids (home,
My Listings, seller profile, cart, My Orders) go through
`getCoverImageUrls()`, a single batched `.in("listing_id", [...])` query
instead of one query per listing — the N+1 pattern was deliberately
avoided there from the start. Most list queries also select specific
columns (`select("id, title, size")` etc.) rather than `select("*")` where
the full row isn't needed, though this isn't fully consistent across every
query in the codebase.

## Client/server separation

Clean by construction, not by extra effort: Server Components fetch data
directly from Supabase at request time (no client-side data-fetching
waterfall, no separate API layer to keep in sync), and only genuinely
interactive pieces — the Sell/Edit photo picker, filter panel, favorite/
cart buttons, checkout form — are Client Components. There's no
over-fetching data to the client "just in case"; each Server Component
queries only what that specific page renders.

## Current limitations, summarized

- No pagination (see above) — the main one.
- The rating filter does an unfiltered full-table aggregate in app code.
- A few sequential-instead-of-parallel query chains (item detail page).
- A handful of actively-filtered/sorted columns aren't indexed yet.
- No caching layer of any kind — every request is a live Postgres query.
  Reasonable at this scale; would want `revalidate`-based caching or a
  CDN-cached read path for the browse grid at meaningfully higher traffic.
- Photo storage has no image resizing/optimization pipeline — uploaded
  photos are served as-is (Next/Image resizes for display, but the
  original file size is whatever the user uploaded, up to 5MB per photo).

## What a future version would change first, in order

1. Add pagination to the browse grid and My Listings/Orders/Favorites.
2. Replace the reviews full-table aggregate with a maintained
   `seller_ratings` summary (view or trigger-updated table).
3. Parallelize the item detail page's independent queries.
4. Add the missing indexes (`condition`, `size`, `color`, `orders.listing_id`,
   composite `(status, category)`).
5. Add a caching layer for the browse grid once traffic actually
   justifies it — premature before that.
