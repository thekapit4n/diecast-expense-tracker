export interface PurchaseRecord {
  /* tbl_purchase.id — lets the catalog act on a specific purchase */
  id: string
  quantity: number
  pricePerUnit: number | null
  totalPrice: number | null
  shopName: string | null
  platform: string | null
  paymentDate: string | null
  isChase: boolean
  /* pre-order tracking */
  paymentStatus: string | null
  collectedDate: string | null
  poOrderId: string | null
  /* units from this purchase that have since left the collection */
  disposedQty: number
  /* the individual records of them leaving, newest handled by the UI */
  disposals: CatalogDisposal[]
}

/** One record of units leaving the collection, as shown on the catalog card. */
export interface CatalogDisposal {
  quantity: number
  reason: string
  handover: string | null
  disposalDate: string | null
  counterparty: string | null
  grossAmount: number | null
  remark: string | null
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
  imageVersion: number | null
  /* individual purchase records — sorted by price desc in detail view */
  purchases: PurchaseRecord[]
  /* aggregated for card display */
  totalQty: number
  /* quantity still tracked in a PO deal, not yet collected + paid */
  preOrderQty: number
  isChase: boolean
  /* detail flags */
  isCase: boolean
}

export interface CatalogBrand {
  id: number
  name: string
}
