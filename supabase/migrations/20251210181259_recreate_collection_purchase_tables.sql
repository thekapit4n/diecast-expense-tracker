-- ========================================
-- TABLE: tbl_collection
-- ========================================
CREATE TABLE IF NOT EXISTS public.tbl_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  item_no TEXT,
  brand_id INT REFERENCES public.tbl_master_brand(id) ON DELETE SET NULL,
  scale TEXT,
  remark TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  created_by TEXT,
  updated_at BIGINT,
  updated_by TEXT
);

-- ========================================
-- TABLE: tbl_collection_detail
-- ========================================
CREATE TABLE IF NOT EXISTS public.tbl_collection_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.tbl_collection(id) ON DELETE CASCADE,
  purchase_id UUID, -- reference later if needed
  quantity INT DEFAULT 1,
  brand_id INT REFERENCES public.tbl_master_brand(id) ON DELETE SET NULL,
  is_case BOOLEAN DEFAULT FALSE,
  edition_type TEXT,        -- normal / event / ltd / bkld / exclusive etc
  packaging_type TEXT,      -- box / blister / lbwk blister / special box
  series_no TEXT,
  size_detail TEXT,         -- diorama sizing, base size, etc
  has_acrylic BOOLEAN DEFAULT FALSE,
  is_chase BOOLEAN DEFAULT FALSE,
  remark TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  created_by TEXT,
  updated_at BIGINT,
  updated_by TEXT
);

-- ========================================
-- TABLE: tbl_purchase
-- ========================================
CREATE TABLE IF NOT EXISTS public.tbl_purchase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.tbl_collection(id) ON DELETE SET NULL,
  quantity INT DEFAULT 1,
  price_per_unit NUMERIC(12,2),
  total_price NUMERIC(12,2),
  purchase_type TEXT,        -- online / shop / meetup etc
  pre_order_status TEXT,     -- pending / paid / cancelled
  pre_order_date DATE,
  payment_status TEXT,       -- unpaid / paid / refunded
  payment_method TEXT,       -- cash / card / fpX / ewallet
  payment_date DATE,
  arrival_date DATE,
  url_link TEXT,
  -- Paid version (NORMAL / CHASE / LTD / EVENT etc)
  is_chase BOOLEAN DEFAULT FALSE,
  edition_type TEXT,
  packaging_type TEXT,
  size_detail TEXT,
  has_acrylic BOOLEAN DEFAULT FALSE,
  remark TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  created_by TEXT,
  updated_at BIGINT,
  updated_by TEXT
);

