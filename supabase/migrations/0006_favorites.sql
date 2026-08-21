-- Favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_listing_id_idx on public.favorites (listing_id);

alter table public.favorites enable row level security;

create policy "Users can manage their own favorites"
  on public.favorites
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Update listings RLS: also allow users to read their favorited listings (even when sold)
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

-- Update listing_images RLS similarly
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
