import type { SupabaseClient } from "@supabase/supabase-js"

export interface ResolveShopInput {
  shopName: string | null | undefined
  address: string | null | undefined
  country: string | null | undefined
}

const norm = (s: string | null | undefined): string =>
  (s == null || typeof s !== "string" ? "" : s.trim())

/**
 * Resolve or create a shop in tbl_shop_information.
 * Returns shop_id (UUID) or null if all inputs are empty.
 * Matching uses same null/empty semantics as backfill (COALESCE(TRIM(x), '')).
 */
export async function resolveOrCreateShop(
  supabase: SupabaseClient,
  input: ResolveShopInput
): Promise<{ shopId: string | null }> {
  const sn = norm(input.shopName)
  const ad = norm(input.address)
  const co = norm(input.country)

  if (sn === "" && ad === "" && co === "") {
    return { shopId: null }
  }

  /* Match in JS with same null/empty semantics as backfill migration */
  const { data: rows, error: selectError } = await supabase
    .from("tbl_shop_information")
    .select("id, shop_name, address, country")

  if (selectError) throw selectError
  const match = rows?.find(
    (r) =>
      norm(r.shop_name) === sn && norm(r.address) === ad && norm(r.country) === co
  )
  if (match) return { shopId: match.id }

  const { data: inserted, error } = await supabase
    .from("tbl_shop_information")
    .insert({
      shop_name: sn || null,
      address: ad || null,
      country: co || null,
    })
    .select("id")
    .single()

  if (error) throw error
  return { shopId: inserted?.id ?? null }
}
