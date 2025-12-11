-- Add platform column to tbl_purchase for online purchase platforms
ALTER TABLE public.tbl_purchase
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.tbl_purchase.platform IS 'Platform used for online purchases (e.g., shopee, lazada, etc.)';

