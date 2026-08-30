-- Records a car LEAVING the collection: given away, sold, traded or lost.
--
-- Until now the app only knew how to record buying. Ownership was derived
-- purely from tbl_purchase state (paid, and collected when it's a PO item),
-- so there was no way to say "I used to have this, now I don't" without
-- deleting the purchase — which would also erase the money actually spent.
--
-- This table is the outflow side of that ledger. The purchase row stays
-- untouched (the expense is real and permanent); the disposal row is what
-- removes the unit from the owned count.
--
-- Two independent fields describe a disposal, and they must not be conflated:
--   reason   -- WHY it left    (gift / sold / ...) -> decides profit
--   handover -- HOW it left    (face to face / shipped / cod) -> decides
--                               which cost fields are relevant
-- A gift handed over face to face and a sale handed over face to face share
-- a handover but report completely differently.

CREATE TABLE IF NOT EXISTS public.tbl_disposal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- RESTRICT, not CASCADE: deleting a purchase that has a sale attached would
  -- silently destroy the record of money earned. The app blocks the delete and
  -- explains why instead.
  purchase_id UUID NOT NULL REFERENCES public.tbl_purchase(id) ON DELETE RESTRICT,
  collection_id UUID REFERENCES public.tbl_collection(id) ON DELETE SET NULL,

  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),

  reason TEXT NOT NULL DEFAULT 'sold',      -- gift / sold / trade / lost / damaged
  handover TEXT,                            -- face_to_face / shipped / cod
  disposal_date DATE,
  counterparty TEXT,                        -- buyer name, or "Amir's son"

  -- Money. All zero for a gift.
  gross_amount NUMERIC(12,2) DEFAULT 0,     -- what the buyer paid you
  postage_out NUMERIC(12,2) DEFAULT 0,      -- postage you paid to send it
  fees NUMERIC(12,2) DEFAULT 0,             -- platform cut, or the COD charge

  -- COD splits "car left" from "money arrived", so the sale side needs the
  -- same lifecycle the buy side already has on tbl_purchase.payment_status.
  -- Face-to-face sales are written straight as 'received'.
  payment_status TEXT DEFAULT 'received',   -- pending / received / failed
  payment_received_date DATE,

  -- A refused COD parcel comes back. Flipping status to 'returned' puts the
  -- unit back in the collection while keeping the wasted postage on record —
  -- deleting the row would lose that.
  status TEXT NOT NULL DEFAULT 'active',    -- active / returned

  remark TEXT,

  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at BIGINT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tbl_disposal_purchase_id ON public.tbl_disposal(purchase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_disposal_collection_id ON public.tbl_disposal(collection_id);

COMMENT ON TABLE public.tbl_disposal IS 'Outflow ledger: units that left the collection (gift/sold/trade/lost). Purchase rows are never deleted for this — the expense stays, only the owned count drops.';
COMMENT ON COLUMN public.tbl_disposal.reason IS 'WHY the unit left. Only reason=sold feeds the profit report; a gift is consumption, not a trading loss.';
COMMENT ON COLUMN public.tbl_disposal.handover IS 'HOW the unit changed hands: face_to_face / shipped / cod. Independent of reason; decides which money fields apply.';
COMMENT ON COLUMN public.tbl_disposal.fees IS 'Platform cut (Shopee/Carousell) or the courier COD collection charge — one box, both cases.';
COMMENT ON COLUMN public.tbl_disposal.payment_status IS 'pending / received / failed. Mirrors the buy side: no profit counted until money is actually received.';
COMMENT ON COLUMN public.tbl_disposal.status IS 'active = unit is gone. returned = buyer refused (COD), unit is back in the collection but postage already spent stays recorded.';

-- ========================================
-- Guard: never dispose more units than were bought
-- ========================================
-- A purchase row can carry quantity > 1 (bought 3 of the same car), and a
-- purchase can have several disposals over time (gifted 1, sold 1 later).
-- A plain child table cannot express "the total must not exceed the parent",
-- so enforce it here. Only 'active' rows count — a returned one freed its unit.
CREATE OR REPLACE FUNCTION public.check_disposal_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purchase_qty INT;
  already_disposed INT;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT quantity INTO purchase_qty
  FROM public.tbl_purchase
  WHERE id = NEW.purchase_id;

  IF purchase_qty IS NULL THEN
    RAISE EXCEPTION 'Purchase % not found', NEW.purchase_id;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO already_disposed
  FROM public.tbl_disposal
  WHERE purchase_id = NEW.purchase_id
    AND status = 'active'
    AND id <> NEW.id;

  IF already_disposed + NEW.quantity > purchase_qty THEN
    RAISE EXCEPTION
      'Cannot record % unit(s) leaving: this purchase has % unit(s) and % already left',
      NEW.quantity, purchase_qty, already_disposed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_disposal_quantity ON public.tbl_disposal;

CREATE TRIGGER trg_check_disposal_quantity
  BEFORE INSERT OR UPDATE ON public.tbl_disposal
  FOR EACH ROW
  EXECUTE FUNCTION public.check_disposal_quantity();

-- ========================================
-- RLS
-- ========================================
ALTER TABLE public.tbl_disposal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.tbl_disposal;

CREATE POLICY "Authenticated full access"
  ON public.tbl_disposal
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- The public /catalog page reads tbl_purchase as anon to work out owned
-- quantity. It has to read disposals too, otherwise a car you gave away would
-- still show as owned to logged-out visitors.
DROP POLICY IF EXISTS "Public anon select" ON public.tbl_disposal;

CREATE POLICY "Public anon select"
  ON public.tbl_disposal
  FOR SELECT
  TO anon
  USING (true);
