export interface PurchaseRecord {
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
