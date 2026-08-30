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

export interface PurchaseQuantityFields extends PurchaseOwnershipFields {
  quantity: number
  /** Units from this purchase that have since left — gifted, sold or lost.
   *  Summed from tbl_disposal; 0 when nothing left. */
  disposedQty: number
}

/** Units still physically in the collection.
 *
 *  Ownership has two independent halves: the purchase has to have completed
 *  (paid, and collected for PO items), and the unit must not have left since.
 *  A car given away is just as gone as one that was sold, so every disposal
 *  reason reduces this — only the profit report cares about which. */
export function ownedQuantity(p: PurchaseQuantityFields): number {
  if (!isOwnedPurchase(p)) return 0
  return Math.max(p.quantity - p.disposedQty, 0)
}
