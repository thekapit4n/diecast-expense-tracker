-- Add shop location fields to tbl_purchase
ALTER TABLE public.tbl_purchase
ADD COLUMN shop_name TEXT,
ADD COLUMN address TEXT,
ADD COLUMN country TEXT;

