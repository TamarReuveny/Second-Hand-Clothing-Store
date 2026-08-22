-- Backfills three pieces of schema that already exist on the live database
-- (added ad hoc, outside a committed migration, while building search/filters,
-- cart+checkout, and seller ratings) so a fresh setup from this repo actually
-- works. Every statement is idempotent — safe to run even though the live DB
-- already has these objects.

-- ---- listings.color ----
-- Required field on the sell/edit form and used by the color filter.
alter table public.listings
  add column if not exists color text not null default 'Black';

-- ---- cart_items ----
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists cart_items_user_id_idx on public.cart_items (user_id);
-- create unique index (not an inline table constraint) so this also applies
-- retroactively if cart_items already existed without it.
create unique index if not exists cart_items_user_listing_idx
  on public.cart_items (user_id, listing_id);

alter table public.cart_items enable row level security;

drop policy if exists "Users manage their own cart" on public.cart_items;
create policy "Users manage their own cart"
  on public.cart_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- reviews ----
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists reviews_seller_id_idx on public.reviews (seller_id);
create unique index if not exists reviews_order_id_idx on public.reviews (order_id);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are publicly readable" on public.reviews;
create policy "Reviews are publicly readable"
  on public.reviews for select
  using (true);

drop policy if exists "Buyers can review their own completed orders" on public.reviews;
create policy "Buyers can review their own completed orders"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.buyer_id = auth.uid()
        and o.seller_id = seller_id
    )
  );
