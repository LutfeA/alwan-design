-- ALWAN DESIGN / Supabase database setup
-- Run this whole script in Supabase Dashboard > SQL Editor.
-- This creates products, an admin allow-list, and public product-image storage.
-- Never put the Supabase service_role key in frontend files.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'عام',
  description text not null default '',
  price numeric(10,2),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  colors text[] not null default '{}',
  image_urls text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_nonnegative check (price is null or price >= 0)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.products enable row level security;

-- A signed-in user can only read their own admin membership row.
drop policy if exists "admins_read_own_membership" on public.admins;
create policy "admins_read_own_membership"
on public.admins for select
to authenticated
using (user_id = auth.uid());

-- Public visitors see active products only; admins can see all products.
drop policy if exists "public_read_active_products" on public.products;
create policy "public_read_active_products"
on public.products for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "admins_insert_products" on public.products;
create policy "admins_insert_products"
on public.products for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins_update_products" on public.products;
create policy "admins_update_products"
on public.products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins_delete_products" on public.products;
create policy "admins_delete_products"
on public.products for delete
to authenticated
using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admins to authenticated;

-- Public image bucket. Only admins may upload, replace or delete images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = true, file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "admins_upload_product_images" on storage.objects;
create policy "admins_upload_product_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins_update_product_images" on storage.objects;
create policy "admins_update_product_images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins_delete_product_images" on storage.objects;
create policy "admins_delete_product_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- FIRST ADMIN SETUP:
-- 1) Create a user in Supabase Dashboard > Authentication > Users > Add user.
-- 2) Replace the email below with that user's email, then run this statement separately.
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'your-admin-email@example.com'
-- on conflict (user_id) do nothing;
