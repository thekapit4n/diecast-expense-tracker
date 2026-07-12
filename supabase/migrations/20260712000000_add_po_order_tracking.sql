-- PO order header: groups purchase line items bought under the same
-- pre-order deal/announcement (shared seller, ETA and close date), so
-- that info doesn't need to be re-entered per item.
CREATE TABLE IF NOT EXISTS public.tbl_po_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.tbl_shop_information(id) ON DELETE SET NULL,
  reference TEXT,
  channel TEXT,
  eta TEXT,
  po_close_date DATE,
  full_payment BOOLEAN DEFAULT FALSE,
  order_date DATE,
  remark TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at BIGINT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.tbl_po_order IS 'Header for a pre-order deal that groups one or more tbl_purchase line items sharing the same seller, ETA and close date';
COMMENT ON COLUMN public.tbl_po_order.reference IS 'Seller-provided PO code/name, e.g. "PRE035"';
COMMENT ON COLUMN public.tbl_po_order.channel IS 'facebook / whatsapp / instagram / other';
COMMENT ON COLUMN public.tbl_po_order.eta IS 'Free text ETA, e.g. "Q1 2027" or "After event"';

-- Extend tbl_purchase for PO tracking: optional link to an order, variant
-- reveal state, pickup lifecycle (ready/deadline/collected), and running
-- amount actually paid so far (for partial/deposit payments).
ALTER TABLE public.tbl_purchase
  ADD COLUMN IF NOT EXISTS po_order_id UUID REFERENCES public.tbl_po_order(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_status TEXT DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS ready_date DATE,
  ADD COLUMN IF NOT EXISTS pickup_deadline DATE,
  ADD COLUMN IF NOT EXISTS collected_date DATE,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN public.tbl_purchase.po_order_id IS 'Optional link to tbl_po_order when this purchase is part of a tracked PO deal';
COMMENT ON COLUMN public.tbl_purchase.variant_status IS 'regular / chase / combo / unknown -- unknown until seller reveals a random-chase result';
COMMENT ON COLUMN public.tbl_purchase.ready_date IS 'Date the seller notified the item is ready for pickup';
COMMENT ON COLUMN public.tbl_purchase.pickup_deadline IS 'Optional informational deadline given by the seller to collect the item; not enforced';
COMMENT ON COLUMN public.tbl_purchase.collected_date IS 'Date the buyer physically collected the item';
COMMENT ON COLUMN public.tbl_purchase.amount_paid IS 'Running total actually paid so far; total_price - amount_paid is the outstanding balance';
