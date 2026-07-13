export interface PurchaseOwnershipFields {
  paymentStatus: string | null
  poOrderId: string | null
  collectedDate: string | null
}

/** A purchase counts as "owned" once it's paid, and — if it's a tracked PO
 *  item — has also been physically collected. Direct/non-PO purchases have
 *  no pickup lifecycle, so paid alone is enough for those. */
export function isOwnedPurchase(p: PurchaseOwnershipFields): boolean {
  return p.paymentStatus === "paid" && (!p.poOrderId || !!p.collectedDate)
}

export function isPreOrderPurchase(p: PurchaseOwnershipFields): boolean {
  return !!p.poOrderId && !isOwnedPurchase(p)
}
