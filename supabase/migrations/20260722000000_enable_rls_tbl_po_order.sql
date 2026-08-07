-- Fix Supabase security advisor: rls_disabled_in_public on public.tbl_po_order.
-- The table was created in 20260712000000_add_po_order_tracking.sql without RLS,
-- so the anon key (public in the web bundle / mobile app) could read and write it.
--
-- tbl_po_order is only used behind login (purchase/add, preorder-tracker, mobile
-- app), so authenticated-only access is enough. No anon policy here: the public
-- /catalog page does not read this table.

-- Written 2026-07-22 but never pushed; by 2026-08-07 the same policy had been
-- created by hand in the Supabase dashboard. Postgres has no
-- `create policy if not exists`, so drop first to keep this re-runnable —
-- otherwise the duplicate name aborts the whole push. The dashboard policy is
-- identical to the one below (for all, to authenticated, using/with check
-- true), so the drop-and-recreate is a no-op in effect.

alter table public.tbl_po_order enable row level security;

drop policy if exists "Authenticated full access" on public.tbl_po_order;

create policy "Authenticated full access"
  on public.tbl_po_order
  for all
  to authenticated
  using (true)
  with check (true);
