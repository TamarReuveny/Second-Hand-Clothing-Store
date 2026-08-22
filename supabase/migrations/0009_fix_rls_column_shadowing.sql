-- Root cause of the earlier "buyer gets 404 on their own purchased item"
-- bug: 0005/0006/0008 wrote correlated EXISTS subqueries like
--   where o.listing_id = id and o.buyer_id = auth.uid()
-- intending the bare `id` to mean the outer table's id (listings.id).
-- But `orders` itself has a column named `id`, and unqualified
-- identifiers in a subquery resolve to the *nearest* enclosing scope
-- first — so `id` actually meant `o.id`, making the condition compare
-- an order's own id to its own listing_id (never true). Postgres was
-- executing this exactly as written; the bug was in the SQL itself, not
-- in how it was pasted/run.
--
-- Same shadowing hit the reviews insert policy: `o.seller_id = seller_id`
-- resolved to `o.seller_id = o.seller_id` (orders has its own seller_id
-- column), which is always true — meaning the check that's supposed to
-- verify the submitted seller_id actually matches the order's seller was
-- silently a no-op. Fixed by qualifying every outer-table reference
-- explicitly instead of relying on bare identifiers.

drop policy if exists "Active listings are publicly readable, sellers see their own" on public.listings;
create policy "Active listings are publicly readable, sellers see their own"
  on public.listings for select
  using (
    status = 'active'
    or seller_id = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.listing_id = listings.id and o.buyer_id = auth.uid()
    )
    or exists (
      select 1 from public.favorites f
      where f.listing_id = listings.id and f.user_id = auth.uid()
    )
  );

drop policy if exists "Images are visible if their listing is visible" on public.listing_images;
create policy "Images are visible if their listing is visible"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.orders o
      where o.listing_id = listing_images.listing_id and o.buyer_id = auth.uid()
    )
    or exists (
      select 1 from public.favorites f
      where f.listing_id = listing_images.listing_id and f.user_id = auth.uid()
    )
  );

drop policy if exists "Buyers can review their own completed orders" on public.reviews;
create policy "Buyers can review their own completed orders"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.buyer_id = auth.uid()
        and o.seller_id = reviews.seller_id
    )
  );
