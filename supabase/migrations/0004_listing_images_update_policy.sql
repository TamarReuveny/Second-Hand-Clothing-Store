-- 0003 added SELECT/INSERT/DELETE policies for listing_images but missed
-- UPDATE, which is needed to renumber photo positions after a removal
-- (e.g. removing photo 0 while keeping photo 1 requires shifting it to 0).

drop policy if exists "Sellers can reorder images on their own listings" on public.listing_images;
create policy "Sellers can reorder images on their own listings"
  on public.listing_images for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );
