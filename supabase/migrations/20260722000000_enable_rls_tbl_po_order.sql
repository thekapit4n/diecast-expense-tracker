-- Fix Supabase security advisor: rls_disabled_in_public on public.tbl_po_order.
-- The table was created in 20260712000000_add_po_order_tracking.sql without RLS,
-- so the anon key (public in the web bundle / mobile app) could read and write it.
--
-- tbl_po_order is only used behind login (purchase/add, preorder-tracker, mobile
-- app), so authenticated-only access is enough. No anon policy here: the public
-- /catalog page does not read this table.

alter table public.tbl_po_order enable row level security;

create policy "Authenticated full access"
  on public.tbl_po_order
  for all
  to authenticated
  using (true)
  with check (true);
