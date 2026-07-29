-- ReWear marketplace schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  size text not null,
  condition text not null check (condition in ('new', 'like-new', 'good', 'fair')),
  category text not null check (
    category in ('tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories')
  ),
  color text not null default '#999999',
  status text not null default 'active' check (status in ('active', 'sold')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  price numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  constraint buyer_not_seller check (buyer_id <> seller_id)
);

create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- purchase_listing: atomically create an order and mark the
-- listing sold, run with the caller's identity checked inside.
-- ============================================================

create or replace function public.purchase_listing(p_listing_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_order public.orders%rowtype;
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

  insert into public.orders (listing_id, buyer_id, seller_id, price)
  values (p_listing_id, auth.uid(), v_listing.seller_id, v_listing.price)
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.purchase_listing(uuid) from public;
grant execute on function public.purchase_listing(uuid) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Active listings are publicly readable, sellers see their own"
  on public.listings for select
  using (status = 'active' or seller_id = auth.uid());

create policy "Sellers can create their own listings"
  on public.listings for insert
  with check (seller_id = auth.uid());

create policy "Sellers can update their own listings"
  on public.listings for update
  using (seller_id = auth.uid());

create policy "Sellers can delete their own listings"
  on public.listings for delete
  using (seller_id = auth.uid());

create policy "Buyers and sellers can read their own orders"
  on public.orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- No direct insert/update/delete policies on orders: all order creation
-- goes through the purchase_listing() function above (security definer),
-- which enforces the business rules atomically.
