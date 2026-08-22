-- Re-asserts the listings/listing_images SELECT policies exactly as defined
-- in 0005 + 0006 combined. Found via e2e testing: a buyer got a 404 on
-- their own purchased (now-sold) item, meaning the live policy had drifted
-- from what's committed (same class of drift as 0007) and was missing the
-- "buyer can see their purchased listing" clause. This is idempotent and
-- safe to run even if the policy was already correct.

drop policy if exists "Active listings are publicly readable, sellers see their own" on public.listings;
create policy "Active listings are publicly readable, sellers see their own"
  on public.listings for select
  using (
    status = 'active'
    or seller_id = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.listing_id = id and o.buyer_id = auth.uid()
    )
    or exists (
      select 1 from public.favorites f
      where f.listing_id = id and f.user_id = auth.uid()
    )
  );

drop policy if exists "Images are visible if their listing is visible" on public.listing_images;
create policy "Images are visible if their listing is visible"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.orders o
      where o.listing_id = listing_id and o.buyer_id = auth.uid()
    )
    or exists (
      select 1 from public.favorites f
      where f.listing_id = listing_id and f.user_id = auth.uid()
    )
  );
