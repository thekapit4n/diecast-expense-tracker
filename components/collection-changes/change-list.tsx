"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  PackageX,
  Undo2,
  Trash2,
  RotateCcw,
  Search,
  ImageOff,
  Maximize2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { buildCatalogItemImageUrls, stripImageCacheVersion } from "@/lib/collection-images"
import { useUserTracking } from "@/lib/auth/use-user-tracking"
import { DISPOSAL_HANDOVERS, isRealisedSale, netProfit, type DisposalRoute } from "@/lib/disposal"

const INITIAL_VISIBLE = 12
const LOAD_MORE_BATCH = 12

interface ChangeRow {
  id: string
  collectionName: string
  itemNo: string | null
  brandName: string
  imageUrls: string[]
  quantity: number
  reason: string
  handover: string | null
  disposalDate: string | null
  counterparty: string | null
  grossAmount: number
  postageOut: number
  fees: number
  paymentStatus: string | null
  status: string
  remark: string | null
  costPerUnit: number
  /* what the car cost you in the first place — the detail that makes a gift
   * card meaningful, since gifts have no sale figures of their own */
  purchaseTotal: number | null
  purchaseQty: number
  shopName: string | null
  purchaseDate: string | null
  isChase: boolean
}

function formatPrice(value: number): string {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function handoverLabel(value: string | null): string | null {
  if (!value) return null
  return DISPOSAL_HANDOVERS.find((h) => h.value === value)?.label ?? value
}

/** Walks the candidate URLs on error, same as the catalog card — the first
 *  guessed path often 404s and the next one is the real photo. Reports the URL
 *  that actually worked so the lightbox opens the same picture. */
function CarThumb({
  urls,
  alt,
  onEnlarge,
}: {
  urls: string[]
  alt: string
  onEnlarge: (url: string) => void
}) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const url = urls.find((u) => !failed.has(stripImageCacheVersion(u))) ?? null

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onEnlarge(url)}
      aria-label={`Enlarge photo of ${alt}`}
      className="group relative block h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Image
        src={url}
        alt={alt}
        fill
        sizes="96px"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
        onError={() =>
          setFailed((prev) => new Set(prev).add(stripImageCacheVersion(url)))
        }
        unoptimized
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
        <Maximize2 className="h-4 w-4 text-white" />
      </span>
    </button>
  )
}

export function ChangeList({ route }: { route: DisposalRoute }) {
  const supabase = createClient()
  const { getUpdateFields } = useUserTracking()

  const [rows, setRows] = useState<ChangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ChangeRow | null>(null)
  const [search, setSearch] = useState("")
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("tbl_disposal")
        .select(
          `id, quantity, reason, handover, disposal_date, counterparty,
           gross_amount, postage_out, fees, payment_status, status, remark,
           tbl_purchase ( price_per_unit, total_price, quantity, is_chase,
                          shop_name, payment_date ),
           tbl_collection ( name, item_no, remark, created_at, updated_at,
                            tbl_master_brand ( name ) )`
        )
        .eq("reason", route.reason)
        .order("disposal_date", { ascending: false })

      if (error) throw error

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const mapped: ChangeRow[] = (data ?? []).map((d: any) => {
        const c = d.tbl_collection
        const brandName = c?.tbl_master_brand?.name ?? "Unknown"
        return {
          id: d.id,
          collectionName: c?.name ?? "Unknown item",
          itemNo: c?.item_no ?? null,
          brandName,
          imageUrls: c
            ? buildCatalogItemImageUrls({
                remark: c.remark ?? null,
                brandName,
                itemNo: c.item_no ?? null,
                collectionName: c.name ?? "",
                imageVersion: c.updated_at ?? c.created_at ?? null,
                isChase: d.tbl_purchase?.is_chase === true,
              })
            : [],
          quantity: Number(d.quantity ?? 1),
          reason: d.reason ?? route.reason,
          handover: d.handover ?? null,
          disposalDate: d.disposal_date ?? null,
          counterparty: d.counterparty ?? null,
          grossAmount: Number(d.gross_amount ?? 0),
          postageOut: Number(d.postage_out ?? 0),
          fees: Number(d.fees ?? 0),
          paymentStatus: d.payment_status ?? null,
          status: d.status ?? "active",
          remark: d.remark ?? null,
          costPerUnit: Number(d.tbl_purchase?.price_per_unit ?? 0),
          purchaseTotal:
            d.tbl_purchase?.total_price != null
              ? Number(d.tbl_purchase.total_price)
              : null,
          purchaseQty: Number(d.tbl_purchase?.quantity ?? 1),
          shopName: d.tbl_purchase?.shop_name ?? null,
          purchaseDate: d.tbl_purchase?.payment_date ?? null,
          isChase: d.tbl_purchase?.is_chase === true,
        }
      })
      /* eslint-enable @typescript-eslint/no-explicit-any */

      setRows(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load"
      setError(message)
      toast.error(`Error loading records: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, route.reason])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.collectionName, r.itemNo, r.brandName, r.counterparty, r.remark]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    )
  }, [rows, search])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [search])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((c) => c + LOAD_MORE_BATCH)
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  /* Money only means anything for sales and trades. Gifts, losses and
   * write-offs get a plain count instead of a fake profit of minus the cost. */
  const isMoneyReason = route.reason === "sold" || route.reason === "trade"

  const summary = useMemo(() => {
    let unitsGone = 0
    let realised = 0
    let pending = 0
    for (const r of rows) {
      if (r.status !== "active") continue
      unitsGone += r.quantity
      const money = {
        quantity: r.quantity,
        reason: r.reason,
        status: r.status,
        paymentStatus: r.paymentStatus,
        grossAmount: r.grossAmount,
        postageOut: r.postageOut,
        fees: r.fees,
      }
      if (isRealisedSale(money)) realised += netProfit(money, r.costPerUnit)
      else if (r.reason === "sold" && r.paymentStatus === "pending") pending += 1
    }
    return { unitsGone, realised, pending }
  }, [rows])

  const setStatus = async (row: ChangeRow, status: "active" | "returned") => {
    setBusyId(row.id)
    try {
      const { error } = await supabase
        .from("tbl_disposal")
        .update({ status, ...getUpdateFields() })
        .eq("id", row.id)
      if (error) throw error
      toast.success(
        status === "returned"
          ? "Marked as returned — the car is back in your collection"
          : "Marked as gone again"
      )
      await fetchRows()
    } catch (err) {
      console.error("Failed to update status:", err)
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setBusyId(toDelete.id)
    try {
      const { error } = await supabase.from("tbl_disposal").delete().eq("id", toDelete.id)
      if (error) throw error
      toast.success("Record removed — the car is back in your collection")
      setToDelete(null)
      await fetchRows()
    } catch (err) {
      console.error("Failed to delete:", err)
      toast.error(err instanceof Error ? err.message : "Failed to remove")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="mb-4 text-destructive">Error: {error}</p>
          <Button onClick={fetchRows}>Retry</Button>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-20 text-center">
        <PackageX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Nothing here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Record one from the Purchase List or a Catalog card.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Cars {route.label.toLowerCase()}</p>
          <p className="mt-1 text-2xl font-semibold">{summary.unitsGone}</p>
        </div>
        {isMoneyReason && (
          <>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold",
                  summary.realised < 0 && "text-destructive"
                )}
              >
                {formatPrice(summary.realised)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">After postage and fees</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Waiting for money</p>
              <p className="mt-1 text-2xl font-semibold">{summary.pending}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">COD not yet received</p>
            </div>
          </>
        )}
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search car name, item no, brand, or who got it"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nothing matches &ldquo;{search}&rdquo;
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {visible.map((r) => {
          const money = {
            quantity: r.quantity,
            reason: r.reason,
            status: r.status,
            paymentStatus: r.paymentStatus,
            grossAmount: r.grossAmount,
            postageOut: r.postageOut,
            fees: r.fees,
          }
          const isReturned = r.status === "returned"
          const profit = netProfit(money, r.costPerUnit)
          const awaitingMoney = isMoneyReason && !isReturned && r.paymentStatus === "pending"

          return (
            <div
              key={r.id}
              className={cn(
                "rounded-xl border p-3",
                isReturned && "border-dashed opacity-60"
              )}
            >
              <div className="flex gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
                  <CarThumb
                    urls={r.imageUrls}
                    alt={r.collectionName}
                    onEnlarge={(url) => setLightbox({ url, alt: r.collectionName })}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{r.collectionName}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[r.brandName, r.itemNo].filter(Boolean).join(" · ")}
                        {r.isChase && (
                          <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                            Chase
                          </span>
                        )}
                      </p>
                    </div>
                    {isMoneyReason && (
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-lg font-semibold",
                            profit < 0 && "text-destructive"
                          )}
                        >
                          {formatPrice(profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isRealisedSale(money) ? "profit" : "not counted yet"}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      r.counterparty,
                      handoverLabel(r.handover),
                      formatDate(r.disposalDate),
                      r.quantity > 1 ? `×${r.quantity}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  {r.remark && (
                    <p className="mt-1 text-sm italic text-muted-foreground">{r.remark}</p>
                  )}

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {isReturned && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Returned
                      </span>
                    )}
                    {awaitingMoney && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Waiting for money
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* What the car cost in the first place. Shown on every card,
                  not just sales — a gift record is meaningless without it. */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
                <span>
                  Paid{" "}
                  <span className="font-medium text-foreground">
                    {formatPrice(r.costPerUnit)}
                  </span>{" "}
                  each
                </span>
                {r.purchaseQty > 1 && r.purchaseTotal != null && (
                  <span>
                    Bought {r.purchaseQty} for {formatPrice(r.purchaseTotal)}
                  </span>
                )}
                {r.shopName && <span>From {r.shopName}</span>}
                {r.purchaseDate && <span>On {formatDate(r.purchaseDate)}</span>}
              </div>

              {isMoneyReason && (
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Got {formatPrice(r.grossAmount)}</span>
                  {r.postageOut > 0 && <span>Postage {formatPrice(r.postageOut)}</span>}
                  {r.fees > 0 && <span>Fees {formatPrice(r.fees)}</span>}
                  <span>Car cost {formatPrice(r.costPerUnit * r.quantity)}</span>
                </div>
              )}

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {isReturned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r, "active")}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    It left again
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r, "returned")}
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                    Came back to me
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busyId === r.id}
                  onClick={() => setToDelete(r)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remove record
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div ref={sentinelRef} className="h-8" />

      {hasMore && (
        <p className="pb-4 text-center text-xs text-muted-foreground">
          Showing {visible.length} of {filtered.length}
        </p>
      )}

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        {/* The close X inherits foreground colour, which disappears against a
            photo — force it white with a shadow so it reads on any image. */}
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none sm:max-w-3xl [&>button]:top-2 [&>button]:right-2 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100">
          {/* Radix requires a title for screen readers; the picture is the
              whole point here, so it's hidden visually. */}
          <DialogTitle className="sr-only">{lightbox?.alt ?? "Car photo"}</DialogTitle>
          {lightbox && (
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/40">
              <Image
                src={lightbox.url}
                alt={lightbox.alt}
                fill
                sizes="(max-width: 768px) 90vw, 768px"
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          <p className="mt-2 text-center text-sm text-white drop-shadow">
            {lightbox?.alt}
          </p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this record?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  This deletes the record that{" "}
                  <span className="font-semibold text-foreground">
                    {toDelete?.collectionName}
                  </span>{" "}
                  left your collection. The car goes back to being owned, and any
                  money recorded against it is forgotten.
                </p>
                <p>
                  Use this only when you recorded it by mistake. If it was sent back
                  to you, use <span className="font-semibold">Came back to me</span>{" "}
                  instead — that keeps the postage you already spent on record.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
