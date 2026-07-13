import { createServerSupabaseClient } from "@/lib/supabase/server"
import { buildCatalogItemImageUrls } from "@/lib/collection-images"
import { isOwnedPurchase, isPreOrderPurchase } from "@/lib/catalog-ownership"
import type { CatalogItem, CatalogBrand, PurchaseRecord } from "@/lib/catalog-types"
import CatalogClient from "./components/CatalogClient"

/* -------------------------------------------------------------------------
 * Page (Server Component)
 * ---------------------------------------------------------------------- */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; itemNo?: string; brand?: string }>
}) {
  const params = await searchParams
  const initialSearch = (params.search ?? params.itemNo ?? "").trim()
  const initialBrand = (params.brand ?? "").trim()
  const supabase = await createServerSupabaseClient()

  const [
    { data: collectionsRaw },
    { data: brandsRaw },
    { data: purchasesRaw },
    { data: detailsRaw },
  ] = await Promise.all([
    supabase
      .from("tbl_collection")
      .select("id, name, item_no, scale, remark, brand_id, created_at, updated_at, tbl_master_brand(name)")
      .order("name", { ascending: true }),

    supabase
      .from("tbl_master_brand")
      .select("id, name, type")
      .eq("isactive", 1)
      .eq("type", "Diecast")
      .order("name"),

    supabase
      .from("tbl_purchase")
      .select(
        "collection_id, quantity, price_per_unit, total_price, is_chase, shop_name, platform, payment_date, payment_status, collected_date, po_order_id"
      ),

    supabase
      .from("tbl_collection_detail")
      .select("collection_id, is_case"),
  ])

  /* ---- Group individual purchase records per collection_id ---- */
  type PurchaseRow = {
    collection_id: string | null
    quantity: number | null
    price_per_unit: number | null
    total_price: number | null
    is_chase: boolean | null
    shop_name: string | null
    platform: string | null
    payment_date: string | null
    payment_status: string | null
    collected_date: string | null
    po_order_id: string | null
  }

  const purchaseMap = new Map<string, PurchaseRecord[]>()

  for (const p of (purchasesRaw ?? []) as PurchaseRow[]) {
    if (!p.collection_id) continue
    const record: PurchaseRecord = {
      quantity: Number(p.quantity ?? 1),
      pricePerUnit: p.price_per_unit != null ? Number(p.price_per_unit) : null,
      totalPrice: p.total_price != null ? Number(p.total_price) : null,
      shopName: p.shop_name ?? null,
      platform: p.platform ?? null,
      paymentDate: p.payment_date ?? null,
      isChase: p.is_chase === true,
      paymentStatus: p.payment_status ?? null,
      collectedDate: p.collected_date ?? null,
      poOrderId: p.po_order_id ?? null,
    }
    const list = purchaseMap.get(p.collection_id)
    if (list) {
      list.push(record)
    } else {
      purchaseMap.set(p.collection_id, [record])
    }
  }

  /* ---- Aggregate collection_detail per collection_id ---- */
  type DetailRow = { collection_id: string | null; is_case: boolean | null }
  const detailMap = new Map<string, { isCase: boolean }>()

  for (const d of (detailsRaw ?? []) as DetailRow[]) {
    if (!d.collection_id) continue
    if (!detailMap.has(d.collection_id)) {
      detailMap.set(d.collection_id, { isCase: d.is_case === true })
    } else if (d.is_case) {
      detailMap.get(d.collection_id)!.isCase = true
    }
  }

  /* ---- Build CatalogItem array ---- */
  type CollectionRow = {
    id: string
    name: string
    item_no: string | null
    scale: string | null
    remark: string | null
    brand_id: number | null
    created_at: number | null
    updated_at: number | null
    tbl_master_brand?: { name: string } | Array<{ name: string }> | null
  }

  const items: CatalogItem[] = ((collectionsRaw ?? []) as CollectionRow[]).map((c) => {
    const imageVersion = c.updated_at ?? c.created_at ?? null
    const brandObj = Array.isArray(c.tbl_master_brand)
      ? (c.tbl_master_brand[0] ?? null)
      : c.tbl_master_brand ?? null
    const brandName = brandObj ? (brandObj as { name: string }).name : "Unknown"
    const purchases = purchaseMap.get(c.id) ?? []
    const detail = detailMap.get(c.id)

    return {
      id: c.id,
      name: c.name,
      item_no: c.item_no,
      scale: c.scale,
      remark: c.remark,
      brand_name: brandName,
      brand_id: c.brand_id,
      imageUrls: buildCatalogItemImageUrls({
        remark: c.remark,
        brandName,
        itemNo: c.item_no,
        collectionName: c.name,
        imageVersion,
      }),
      imageVersion,
      purchases,
      totalQty: purchases.reduce((sum, p) => sum + (isOwnedPurchase(p) ? p.quantity : 0), 0),
      preOrderQty: purchases.reduce((sum, p) => sum + (isPreOrderPurchase(p) ? p.quantity : 0), 0),
      isChase: purchases.some((p) => p.isChase),
      isCase: detail?.isCase ?? false,
    }
  })

  /* ---- Build brands list: only brands that have collection data ---- */
  const brandIdsWithData = new Set(
    ((collectionsRaw ?? []) as { brand_id: number | null }[])
      .map((c) => c.brand_id)
      .filter((id): id is number => id != null)
  )

  const brands: CatalogBrand[] = (
    (brandsRaw ?? []) as { id: number; name: string; type: string }[]
  )
    .filter((b) => brandIdsWithData.has(b.id))
    .map((b) => ({ id: b.id, name: b.name }))

  /* ---- Default to Mini GT if present ---- */
  const defaultBrand =
    brands.find((b) => b.name.toLowerCase().includes("mini gt"))?.name ?? null

  return (
    <CatalogClient
      items={items}
      brands={brands}
      defaultBrand={defaultBrand}
      initialSearch={initialSearch}
      initialBrand={initialBrand || undefined}
    />
  )
}
