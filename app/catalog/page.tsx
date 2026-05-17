import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  getBrandStorageImageUrls,
  mergeCatalogImageUrls,
} from "@/lib/collection-images"
import CatalogClient from "./components/CatalogClient"

/* -------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------- */
export interface PurchaseRecord {
  quantity: number
  pricePerUnit: number | null
  totalPrice: number | null
  shopName: string | null
  platform: string | null
  paymentDate: string | null
  isChase: boolean
}

export interface CatalogItem {
  id: string
  name: string
  item_no: string | null
  scale: string | null
  remark: string | null
  brand_name: string
  brand_id: number | null
  imageUrls: string[]
  /* individual purchase records — sorted by price desc in detail view */
  purchases: PurchaseRecord[]
  /* aggregated for card display */
  totalQty: number
  isChase: boolean
  /* detail flags */
  isCase: boolean
}

export interface CatalogBrand {
  id: number
  name: string
}

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */
const DEFAULT_IMAGE_SLOTS = 5

function getSeriesImageUrls(itemNo: string | null): string[] {
  if (!itemNo) return []
  const normalized = itemNo.trim().toUpperCase()
  const series = normalized.match(/MGT\d+/)?.[0] || normalized
  if (!/^MGT\d{5}$/.test(series)) return []
  return Array.from({ length: DEFAULT_IMAGE_SLOTS }, (_, i) =>
    `/api/catalog/image/${series}/${i + 1}.jpg`
  )
}

function extractRemarkImageUrls(remark: string | null): string[] {
  if (!remark) return []
  const matches = remark.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)|\/api\/[^\s]+\.(?:jpg|jpeg|png|webp|gif))/gi)
  if (!matches) return []
  /* Rewrite any mini-gt image API URLs to the public catalog endpoint */
  return matches.map((url) =>
    url.replace(/^\/api\/mini-gt\/image\//, "/api/catalog/image/")
  )
}

/* -------------------------------------------------------------------------
 * Page (Server Component)
 * ---------------------------------------------------------------------- */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; itemNo?: string }>
}) {
  const params = await searchParams
  const initialSearch = (params.search ?? params.itemNo ?? "").trim()
  const supabase = await createServerSupabaseClient()

  const [
    { data: collectionsRaw },
    { data: brandsRaw },
    { data: purchasesRaw },
    { data: detailsRaw },
  ] = await Promise.all([
    supabase
      .from("tbl_collection")
      .select("id, name, item_no, scale, remark, brand_id, tbl_master_brand(name)")
      .order("name", { ascending: true }),

    supabase
      .from("tbl_master_brand")
      .select("id, name, type")
      .eq("isactive", 1)
      .eq("type", "Diecast")
      .order("name"),

    supabase
      .from("tbl_purchase")
      .select("collection_id, quantity, price_per_unit, total_price, is_chase, shop_name, platform, payment_date"),

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
    tbl_master_brand?: { name: string } | Array<{ name: string }> | null
  }

  const items: CatalogItem[] = ((collectionsRaw ?? []) as CollectionRow[]).map((c) => {
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
      imageUrls: mergeCatalogImageUrls(
        extractRemarkImageUrls(c.remark),
        getBrandStorageImageUrls(brandName, c.item_no, c.name),
        getSeriesImageUrls(c.item_no)
      ),
      purchases,
      totalQty: purchases.reduce((sum, p) => sum + p.quantity, 0),
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
    />
  )
}
