-- Create shop information table for normalizing shop data (suggestions and management)
CREATE TABLE IF NOT EXISTS public.tbl_shop_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT,
  address TEXT,
  country TEXT
);

COMMENT ON TABLE public.tbl_shop_information IS 'Master list of shops for purchase suggestions and management';
