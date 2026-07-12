-- amount_paid was added after this project already had paid purchases on
-- record, so those rows still have amount_paid at its default of 0 even
-- though payment_status says 'paid'. Backfill so amount_paid becomes a
-- reliable source of truth for "money actually spent" across all purchases,
-- old and new.
UPDATE public.tbl_purchase
SET amount_paid = total_price
WHERE payment_status = 'paid'
  AND (amount_paid IS NULL OR amount_paid = 0);
