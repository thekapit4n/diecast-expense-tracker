-- Link to the original PO announcement (FB post, WhatsApp broadcast, etc.)
-- Lives on the order header since it's shared by every item bought under
-- that deal, not per purchase line item.
ALTER TABLE public.tbl_po_order
  ADD COLUMN IF NOT EXISTS source_link TEXT;

COMMENT ON COLUMN public.tbl_po_order.source_link IS 'Link to the seller''s PO post/announcement, e.g. Facebook post URL';
