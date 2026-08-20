-- Moves listing photos from a single image_path column to a proper
-- one-to-many listing_images table, so each listing can have several photos.

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  image_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_id_idx
  on public.listing_images (listing_id);

-- Carry forward any existing single photos as position 0.
insert into public.listing_images (listing_id, image_path, position)
select id, image_path, 0
from public.listings
where image_path is not null
on conflict do nothing;

alter table public.listings drop column if exists image_path;

alter table public.listing_images enable row level security;

drop policy if exists "Images are visible if their listing is visible" on public.listing_images;
create policy "Images are visible if their listing is visible"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

drop policy if exists "Sellers can add images to their own listings" on public.listing_images;
create policy "Sellers can add images to their own listings"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

drop policy if exists "Sellers can remove images from their own listings" on public.listing_images;
create policy "Sellers can remove images from their own listings"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );
