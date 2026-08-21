-- Fix listings RLS: buyers can read listings they have purchased
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
  );

-- Fix listing_images RLS: buyers can see images for listings they purchased
drop policy if exists "Images are visible if their listing is visible" on public.listing_images;
create policy "Images are visible if their listing is visible"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
    or
    exists (
      select 1 from public.orders o
      where o.listing_id = listing_id and o.buyer_id = auth.uid()
    )
  );

-- Snapshot item details into orders so they survive if a listing is later deleted
alter table public.orders
  add column if not exists listing_title text,
  add column if not exists listing_size text;

-- Update purchase_listing to record the snapshot at purchase time
create or replace function public.purchase_listing(p_listing_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_order   public.orders%rowtype;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'Listing is no longer available';
  end if;

  if v_listing.seller_id = auth.uid() then
    raise exception 'You cannot buy your own listing';
  end if;

  update public.listings set status = 'sold' where id = p_listing_id;

  insert into public.orders (listing_id, buyer_id, seller_id, price, listing_title, listing_size)
  values (p_listing_id, auth.uid(), v_listing.seller_id, v_listing.price, v_listing.title, v_listing.size)
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.purchase_listing(uuid) from public;
grant execute on function public.purchase_listing(uuid) to authenticated;
