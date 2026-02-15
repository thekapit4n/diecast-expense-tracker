/*
 * Backfill tbl_shop_information from distinct (shop_name, address, country) in tbl_purchase.
 * Null and empty string treated the same for matching.
 */
INSERT INTO public.tbl_shop_information (shop_name, address, country)
SELECT DISTINCT p.shop_name, p.address, p.country
FROM public.tbl_purchase p
WHERE ((p.shop_name IS NOT NULL AND TRIM(p.shop_name) <> '')
   OR (p.address IS NOT NULL AND TRIM(p.address) <> '')
   OR (p.country IS NOT NULL AND TRIM(p.country) <> ''))
AND NOT EXISTS (
  SELECT 1 FROM public.tbl_shop_information si
  WHERE COALESCE(TRIM(si.shop_name), '') = COALESCE(TRIM(p.shop_name), '')
    AND COALESCE(TRIM(si.address), '') = COALESCE(TRIM(p.address), '')
    AND COALESCE(TRIM(si.country), '') = COALESCE(TRIM(p.country), '')
);

/*
 * Set tbl_purchase.shop_id to the matching tbl_shop_information.id
 */
UPDATE public.tbl_purchase p
SET shop_id = si.id
FROM public.tbl_shop_information si
WHERE p.shop_id IS NULL
  AND COALESCE(TRIM(p.shop_name), '') = COALESCE(TRIM(si.shop_name), '')
  AND COALESCE(TRIM(p.address), '') = COALESCE(TRIM(si.address), '')
  AND COALESCE(TRIM(p.country), '') = COALESCE(TRIM(si.country), '');
