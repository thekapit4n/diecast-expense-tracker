/* Disposals — units that left the collection.
 *
 * Two fields describe every disposal and they answer different questions:
 *   reason   -- WHY it left. Only "sold" reaches the profit report.
 *   handover -- HOW it changed hands. Decides which money fields apply.
 * They are independent: a gift can be handed over face to face or posted,
 * and so can a sale.
 */

export type DisposalReason = "sold" | "gift" | "trade" | "lost" | "damaged"
export type DisposalHandover = "face_to_face" | "shipped" | "cod"
export type DisposalPaymentStatus = "pending" | "received" | "failed"
export type DisposalStatus = "active" | "returned"

export const DISPOSAL_REASONS: { value: DisposalReason; label: string }[] = [
  { value: "sold", label: "Sold" },
  { value: "gift", label: "Gift" },
  { value: "trade", label: "Traded" },
  { value: "lost", label: "Lost" },
  { value: "damaged", label: "Damaged" },
]

export const DISPOSAL_HANDOVERS: { value: DisposalHandover; label: string }[] = [
  { value: "face_to_face", label: "Face to face" },
  { value: "shipped", label: "Posted / courier" },
  { value: "cod", label: "COD (cash on delivery)" },
]

/** The "Collection Changes" nav section — one page per reason.
 *  The slug is the URL word and the reason is what's stored in the database;
 *  they differ for gift/gifted and trade/traded, so keep them mapped here
 *  rather than guessing either direction. */
export interface DisposalRoute {
  slug: string
  reason: DisposalReason
  label: string
  blurb: string
}

export const DISPOSAL_ROUTES: DisposalRoute[] = [
  {
    slug: "sold",
    reason: "sold",
    label: "Sold",
    blurb: "Cars you sold, and what each one actually made after postage and fees",
  },
  {
    slug: "gifted",
    reason: "gift",
    label: "Gifted",
    blurb: "Cars you gave away — never counted as a loss, only as gone",
  },
  {
    slug: "traded",
    reason: "trade",
    label: "Traded",
    blurb: "Cars swapped with another collector, recorded at their cash value",
  },
  { slug: "lost", reason: "lost", label: "Lost", blurb: "Cars that went missing" },
  {
    slug: "damaged",
    reason: "damaged",
    label: "Damaged",
    blurb: "Cars written off as damaged",
  },
]

export function disposalRouteBySlug(slug: string): DisposalRoute | undefined {
  return DISPOSAL_ROUTES.find((r) => r.slug === slug)
}

/* Badge wording. Two forms are needed because the two places these appear read
 * differently: a badge on its own ("Gift") versus a count ("1 of 2 gifted"). */
const REASON_BADGE: Record<string, string> = {
  sold: "Sold",
  gift: "Gift",
  trade: "Traded",
  lost: "Lost",
  damaged: "Damaged",
}

const REASON_PAST: Record<string, string> = {
  sold: "sold",
  gift: "gifted",
  trade: "traded",
  lost: "lost",
  damaged: "damaged",
}

/** One purchase can be disposed of in more than one way — bought 2, gifted one
 *  and sold the other. There's no honest single word for that, so a mixed row
 *  falls back to the neutral "Gone" rather than picking a side. */
function singleReason(reasons: string[]): string | null {
  const unique = Array.from(new Set(reasons.filter(Boolean)))
  return unique.length === 1 ? unique[0] : null
}

/** "Gift" / "Sold" / "Gone" — for a badge standing on its own. */
export function disposalBadgeLabel(reasons: string[]): string {
  const only = singleReason(reasons)
  return (only && REASON_BADGE[only]) || "Gone"
}

/** "gifted" / "sold" / "gone" — for reading after a count. */
export function disposalPastLabel(reasons: string[]): string {
  const only = singleReason(reasons)
  return (only && REASON_PAST[only]) || "gone"
}

/** Face-to-face means car and cash change hands at the same moment, so there
 *  is no postage, no platform cut and nothing to wait for. Only shipped and
 *  COD sales need the cost fields — the form hides them otherwise rather than
 *  making the user type zeros. */
export function handoverHasSellingCosts(handover: DisposalHandover): boolean {
  return handover === "shipped" || handover === "cod"
}

/** Only COD separates "car left" from "money arrived". Everything else is
 *  settled on the spot, so the form doesn't ask. */
export function handoverHasPaymentDelay(handover: DisposalHandover): boolean {
  return handover === "cod"
}

export interface DisposalMoneyFields {
  quantity: number
  reason: string | null
  status: string | null
  paymentStatus: string | null
  grossAmount: number
  postageOut: number
  fees: number
}

/** True once this disposal's money is real: it was a sale, the unit actually
 *  left (not a refused COD that came back), and payment arrived.
 *  Mirrors the buy side, where a purchase isn't owned until it's paid. */
export function isRealisedSale(d: DisposalMoneyFields): boolean {
  return d.reason === "sold" && d.status === "active" && d.paymentStatus === "received"
}

/** Units this disposal actually removed from the collection. A returned COD
 *  parcel removed nothing — the car is back on the shelf. */
export function disposedUnits(d: Pick<DisposalMoneyFields, "quantity" | "status">): number {
  return d.status === "active" ? d.quantity : 0
}

/** What you really made, after everything selling took out of it.
 *
 *  costPerUnit comes live from tbl_purchase.price_per_unit rather than being
 *  copied here: that price means "what I actually paid", so the only reason it
 *  ever changes is a typo being corrected — and when that happens the profit
 *  should correct itself too.
 *
 *  Note most existing purchases have postage baked into price_per_unit by
 *  hand, so it is already part of the cost.
 */
export function netProfit(d: DisposalMoneyFields, costPerUnit: number): number {
  const cost = costPerUnit * d.quantity
  return d.grossAmount - d.postageOut - d.fees - cost
}

/** A refused COD still costs you the postage you spent sending it, even
 *  though the car came back and no sale happened. */
export function failedSaleLoss(d: DisposalMoneyFields): number {
  return -(d.postageOut + d.fees)
}
