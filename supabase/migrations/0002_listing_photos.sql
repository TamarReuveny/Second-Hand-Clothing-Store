-- Adds real photo uploads for listings, replacing the placeholder color swatch.
-- Run this in the Supabase SQL Editor (after 0001 / schema.sql has already been applied).

alter table public.listings add column if not exists image_path text;
alter table public.listings drop column if exists color;

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to listing images" on storage.objects;
create policy "Public read access to listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "Users can upload their own listing images" on storage.objects;
create policy "Users can upload their own listing images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own listing images" on storage.objects;
create policy "Users can delete their own listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
