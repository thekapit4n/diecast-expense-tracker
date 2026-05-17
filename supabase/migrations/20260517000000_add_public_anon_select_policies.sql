-- Add SELECT-only policies for the anon role so the public /catalog page
-- can read data without a user session.
-- The existing "authenticated" ALL policies are left untouched.

create policy "Public anon select"
  on public.tbl_master_brand
  for select
  to anon
  using (true);

create policy "Public anon select"
  on public.tbl_collection
  for select
  to anon
  using (true);

create policy "Public anon select"
  on public.tbl_collection_detail
  for select
  to anon
  using (true);

create policy "Public anon select"
  on public.tbl_purchase
  for select
  to anon
  using (true);
