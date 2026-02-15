-- Link tbl_purchase to tbl_shop_information; keep shop_name, address, country for snapshot
ALTER TABLE public.tbl_purchase
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.tbl_shop_information(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tbl_purchase.shop_id IS 'Reference to tbl_shop_information; snapshot columns shop_name, address, country preserved on purchase';
