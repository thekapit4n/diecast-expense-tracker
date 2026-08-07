-- tbl_master_brand.id was created as a plain `integer NOT NULL` primary key
-- with no default, because the table was originally seeded with explicit ids
-- (see 20240101000001_seed_tbl_master_brand.sql). That means every INSERT has
-- to supply an id by hand, which the new Brand Management screen cannot
-- sensibly do without racing itself.
--
-- Give the column a sequence-backed default, the way the other tables have.
-- This does not rewrite the table and leaves existing rows untouched.

create sequence if not exists public.tbl_master_brand_id_seq
  owned by public.tbl_master_brand.id;

-- Start the sequence just past the highest id already in the table, so the
-- first generated id cannot collide with the seeded rows.
select setval(
  'public.tbl_master_brand_id_seq',
  coalesce((select max(id) from public.tbl_master_brand), 0) + 1,
  false
);

alter table public.tbl_master_brand
  alter column id set default nextval('public.tbl_master_brand_id_seq');
