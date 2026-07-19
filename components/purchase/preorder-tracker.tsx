"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Truck, MessageCircle, Facebook, Instagram, ExternalLink, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn, formatDateForDatabase } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
import { toast } from "sonner"
import { PoStatusModal, type PoStatusModalItem } from "./po-status-modal"
import { BulkCollectDialog, type BulkCollectItem } from "./bulk-collect-dialog"
import { BulkStatusUpdateDialog, type BulkStatusUpdateItem, type BulkStatusUpdateResult } from "./bulk-status-update-dialog"
import { useUserTracking } from "@/lib/auth/use-user-tracking"

interface PoTrackerRow {
  id: string
  quantity: number
  price_per_unit: number
  total_price: number
  payment_status: string | null
  amount_paid: number | null
  payment_date: string | null
  payment_method: string | null
  variant_status: string | null
  packaging_type: string | null
  ready_date: string | null
  pickup_deadline: string | null
  collected_date: string | null
  collection_id: string
  collection_name: string
  item_no: string | null
  po_order_id: string
  po_reference: string | null
  po_channel: string | null
  po_eta: string | null
  po_close_date: string | null
  po_order_date: string | null
  po_source_link: string | null
  shop_name: string | null
}

function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null
  const [year, month, day] = dateString.split("-").map(Number)
  const target = new Date(year, month - 1, day)
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = target.getTime() - todayMidnight.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function formatDeadlineLabel(dateString: string | null): string {
  const days = daysUntil(dateString)
  if (days === null) return ""
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`
  if (days === 0) return "Due today"
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past formal deadline`
}

function channelIcon(channel: string | null) {
  switch ((channel || "").toLowerCase()) {
    case "whatsapp":
      return <MessageCircle className="h-4 w-4 text-muted-foreground" />
    case "instagram":
      return <Instagram className="h-4 w-4 text-muted-foreground" />
    case "facebook":
      return <Facebook className="h-4 w-4 text-muted-foreground" />
    default:
      return null
  }
}

function StageBadge({ row }: { row: PoTrackerRow }) {
  if (row.collected_date) {
    return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", tw.badgePaid)}>Collected</span>
  }
  if (row.ready_date) {
    return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", tw.badgeWarning)}>Ready for pickup</span>
  }
  if (row.payment_status === "paid") {
    return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", tw.badgePrimary)}>Paid</span>
  }
  if (row.payment_status === "partial") {
    return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", tw.badgeUnpaid)}>Partial</span>
  }
  return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", tw.badgeMuted)}>Pre-order</span>
}

function variantLabel(status: string | null): string {
  switch (status) {
    case "chase":
      return "Chase"
    case "combo":
      return "Combo (chase + regular)"
    case "unknown":
      return "Variant unknown · reveal later"
    default:
      return "Regular"
  }
}

function packagingLabel(packagingType: string | null): string | null {
  if (!packagingType) return null
  return packagingType
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function PreorderTracker() {
  const supabase = createClient()
  const { getUpdateFields } = useUserTracking()
  const [rows, setRows] = useState<PoTrackerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusModalItem, setStatusModalItem] = useState<PoStatusModalItem | null>(null)
  const [bulkCollectTarget, setBulkCollectTarget] = useState<{ shopName: string; ids: string[] } | null>(null)
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set())
  const [bulkPaymentTarget, setBulkPaymentTarget] = useState<string[] | null>(null)
  const [orderSearch, setOrderSearch] = useState("")
  const [orderTab, setOrderTab] = useState<"pending" | "ready" | "collected">("pending")
  const [orderSort, setOrderSort] = useState<"date" | "name">("date")

  const fetchRows = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tbl_purchase")
        .select(`
          id, quantity, price_per_unit, total_price, payment_status, amount_paid, payment_date, payment_method,
          variant_status, packaging_type, ready_date, pickup_deadline, collected_date, collection_id,
          po_order_id,
          tbl_collection!inner(name, item_no),
          tbl_po_order!inner(id, reference, channel, eta, po_close_date, order_date, source_link, tbl_shop_information(shop_name))
        `)
        .not("po_order_id", "is", null)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formatted: PoTrackerRow[] = (data || []).map((row: any) => ({
        id: row.id,
        quantity: row.quantity,
        price_per_unit: row.price_per_unit,
        total_price: row.total_price,
        payment_status: row.payment_status,
        amount_paid: row.amount_paid,
        payment_date: row.payment_date,
        payment_method: row.payment_method,
        variant_status: row.variant_status,
        packaging_type: row.packaging_type,
        ready_date: row.ready_date,
        pickup_deadline: row.pickup_deadline,
        collected_date: row.collected_date,
        collection_id: row.collection_id,
        collection_name: row.tbl_collection?.name ?? "",
        item_no: row.tbl_collection?.item_no ?? null,
        po_order_id: row.po_order_id,
        po_reference: row.tbl_po_order?.reference ?? null,
        po_channel: row.tbl_po_order?.channel ?? null,
        po_eta: row.tbl_po_order?.eta ?? null,
        po_close_date: row.tbl_po_order?.po_close_date ?? null,
        po_order_date: row.tbl_po_order?.order_date ?? null,
        po_source_link: row.tbl_po_order?.source_link ?? null,
        shop_name: row.tbl_po_order?.tbl_shop_information?.shop_name ?? null,
      }))

      setRows(formatted)
      // Default every ready-for-pickup item to selected; user can uncheck ones they're skipping.
      setSelectedIds(new Set(formatted.filter((r) => r.ready_date && !r.collected_date).map((r) => r.id)))
    } catch (error) {
      console.error("Failed to load PO tracker data:", error)
      toast.error("Failed to load pre-order tracker")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const handleReload = () => {
    setIsRefreshing(true)
    fetchRows()
  }

  const awaitingProduction = rows.filter((r) => !r.ready_date && !r.collected_date)
  const readyForPickup = rows.filter((r) => r.ready_date && !r.collected_date)
  const deadlineSoon = readyForPickup.filter((r) => {
    const days = daysUntil(r.pickup_deadline)
    return days !== null && days <= 7
  })
  const balanceDue = rows
    .filter((r) => !r.collected_date)
    .reduce((sum, r) => sum + Math.max(r.total_price - (r.amount_paid || 0), 0), 0)

  const readyGroupedByShop = useMemo(() => {
    const map = new Map<string, PoTrackerRow[]>()
    for (const row of rows) {
      if (!row.ready_date || row.collected_date) continue
      const key = row.shop_name || "Unknown seller"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return Array.from(map.entries())
  }, [rows])

  const ordersGrouped = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()
    const matchingRows = query
      ? rows.filter(
          (row) =>
            row.collection_name.toLowerCase().includes(query) ||
            (row.item_no ?? "").toLowerCase().includes(query)
        )
      : rows

    const map = new Map<string, PoTrackerRow[]>()
    for (const row of matchingRows) {
      if (!map.has(row.po_order_id)) map.set(row.po_order_id, [])
      map.get(row.po_order_id)!.push(row)
    }

    const groups = Array.from(map.values()).filter((items) => {
      const allCollected = items.every((item) => item.collected_date)
      if (orderTab === "collected") return allCollected
      if (allCollected) return false
      const hasReadyItem = items.some((item) => item.ready_date && !item.collected_date)
      return orderTab === "ready" ? hasReadyItem : !hasReadyItem
    })

    groups.sort((a, b) => {
      if (orderSort === "name") {
        const nameA = a[0].po_reference || a[0].shop_name || a[0].collection_name
        const nameB = b[0].po_reference || b[0].shop_name || b[0].collection_name
        return nameA.localeCompare(nameB)
      }
      // Newest order date first; orders without a date sink to the bottom.
      const dateA = a[0].po_order_date
      const dateB = b[0].po_order_date
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateB.localeCompare(dateA)
    })

    return groups
  }, [rows, orderSearch, orderTab, orderSort])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Bulk payment-update selection is scoped to the Pending tab only —
  // clear it whenever the user switches tabs so a stale selection can't
  // silently apply to items no longer even visible.
  useEffect(() => {
    setSelectedPendingIds(new Set())
  }, [orderTab])

  const togglePendingSelected = (id: string) => {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visiblePendingIds = useMemo(
    () => (orderTab === "pending" ? ordersGrouped.flat().map((item) => item.id) : []),
    [ordersGrouped, orderTab]
  )
  const allPendingSelected =
    visiblePendingIds.length > 0 && visiblePendingIds.every((id) => selectedPendingIds.has(id))

  const toggleSelectAllPending = () => {
    setSelectedPendingIds(allPendingSelected ? new Set() : new Set(visiblePendingIds))
  }

  const handleBulkStatusUpdate = async (result: BulkStatusUpdateResult) => {
    if (!bulkPaymentTarget || bulkPaymentTarget.length === 0) return
    try {
      const updateFields = getUpdateFields()
      const targetRows = rows.filter((r) => bulkPaymentTarget.includes(r.id))

      // Mirrors the single-item PoStatusModal's save logic, applied per row.
      const resolvedPaymentDate =
        result.paymentDate ??
        (result.paymentStatus === "paid" || result.paymentStatus === "partial"
          ? result.collectedDate ?? new Date()
          : undefined)

      await Promise.all(
        targetRows.map((row) => {
          const amount =
            result.paymentStatus === "paid"
              ? row.total_price
              : result.paymentStatus === "partial"
              ? parseFloat(result.amountPaid || "0") || 0
              : 0

          return supabase
            .from("tbl_purchase")
            .update({
              payment_status: result.paymentStatus,
              amount_paid: amount,
              payment_method: result.paymentMethod === "none" ? null : result.paymentMethod,
              payment_date: formatDateForDatabase(resolvedPaymentDate ?? null),
              ready_date: formatDateForDatabase(result.readyDate ?? null),
              pickup_deadline: formatDateForDatabase(result.pickupDeadline ?? null),
              collected_date: formatDateForDatabase(result.collectedDate ?? null),
              ...updateFields,
            })
            .eq("id", row.id)
        })
      )

      toast.success(`Updated ${bulkPaymentTarget.length} item${bulkPaymentTarget.length > 1 ? "s" : ""}`)
      setSelectedPendingIds(new Set())
      setBulkPaymentTarget(null)
      fetchRows()
    } catch (error) {
      console.error("Failed to bulk update status:", error)
      toast.error("Failed to update items")
    }
  }

  const handleMarkCollected = async (ids: string[], paymentMethod: string | null) => {
    if (ids.length === 0) return
    try {
      const updateFields = getUpdateFields()
      const todayIso = formatDateForDatabase(new Date())

      const targetRows = rows.filter((r) => ids.includes(r.id))
      await Promise.all(
        targetRows.map((row) =>
          supabase
            .from("tbl_purchase")
            .update({
              collected_date: todayIso,
              payment_status: "paid",
              amount_paid: row.total_price,
              // Preserve an existing payment date/method (e.g. paid upfront);
              // only backfill for sellers who collect payment on pickup.
              payment_date: row.payment_date ?? todayIso,
              payment_method: paymentMethod ?? row.payment_method,
              ...updateFields,
            })
            .eq("id", row.id)
        )
      )

      toast.success(`Marked ${ids.length} item${ids.length > 1 ? "s" : ""} as collected`)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      setBulkCollectTarget(null)
      fetchRows()
    } catch (error) {
      console.error("Failed to mark as collected:", error)
      toast.error("Failed to update items")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={tw.pageHeading}>Pre-order Tracker</h1>
          <p className="text-muted-foreground">Every PO, ETA and pickup deadline in one place</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReload} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-sm font-medium", tw.textTitle)}>Awaiting production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", tw.textTitle)}>{isLoading ? "…" : awaitingProduction.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-sm font-medium", tw.textTitle)}>Ready for pickup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", tw.textTitle)}>{isLoading ? "…" : readyForPickup.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-sm font-medium", tw.textTitle)}>Deadline under 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", tw.textTitle)}>{isLoading ? "…" : deadlineSoon.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-sm font-medium", tw.textTitle)}>Balance due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", tw.textTitle)}>{isLoading ? "…" : `RM ${balanceDue.toFixed(2)}`}</div>
          </CardContent>
        </Card>
      </div>

      {readyGroupedByShop.length > 0 && (
        <div className="space-y-4">
          {readyGroupedByShop.map(([shopName, items]) => {
            const selectedInGroup = items.filter((i) => selectedIds.has(i.id)).map((i) => i.id)
            const groupTotal = items.reduce((sum, i) => sum + i.total_price, 0)
            return (
              <Card key={shopName} className="border-amber-500/40 bg-amber-500/[0.04]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4 text-amber-500" />
                    Ready for pickup at {shopName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-dashed border-amber-500/30">
                    <div className={cn("max-h-[40vh] overflow-y-auto", tw.scrollbarCatalog)}>
                      {items.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2 border-b border-dashed border-amber-500/20 last:border-b-0 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelected(item.id)}
                          />
                          <span className="flex-1 text-sm truncate">
                            {item.item_no ? `${item.item_no} — ` : ""}
                            {item.collection_name}
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground"> ×{item.quantity}</span>
                            )}
                          </span>
                          {item.pickup_deadline && (
                            <span className="text-xs text-amber-500 whitespace-nowrap">
                              {formatDeadlineLabel(item.pickup_deadline)}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground whitespace-nowrap w-24 text-right">
                            RM {item.total_price.toFixed(2)}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-amber-500/30">
                      <span className={cn("text-sm font-semibold", tw.textTitle)}>
                        Total ({items.length} item{items.length > 1 ? "s" : ""})
                      </span>
                      <span className={cn("text-sm font-semibold", tw.textTitle)}>RM {groupTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    disabled={selectedInGroup.length === 0}
                    onClick={() => setBulkCollectTarget({ shopName, ids: selectedInGroup })}
                  >
                    Mark {selectedInGroup.length || ""} selected as collected
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">All orders</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={orderTab} onValueChange={(v) => setOrderTab(v as "pending" | "ready" | "collected")}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="ready">Ready for pickup</TabsTrigger>
              <TabsTrigger value="collected">Collected</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by name or item number..."
                className="pl-8"
              />
            </div>
            <Select value={orderSort} onValueChange={(v) => setOrderSort(v as "date" | "name")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Pre-order date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {orderTab === "pending" && visiblePendingIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={allPendingSelected} onCheckedChange={toggleSelectAllPending} />
              Select all {visiblePendingIds.length} shown
            </label>
            {selectedPendingIds.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">{selectedPendingIds.size} selected</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPendingIds(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => setBulkPaymentTarget(Array.from(selectedPendingIds))}
                >
                  Bulk update status
                </Button>
              </>
            )}
          </div>
        )}
        <div className={cn("max-h-[65vh] overflow-y-auto pr-1", tw.scrollbarCatalog, "space-y-3")}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : ordersGrouped.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {orderSearch.trim()
                ? `No items match "${orderSearch.trim()}".`
                : orderTab === "collected"
                ? "No collected orders yet."
                : orderTab === "ready"
                ? "Nothing ready for pickup right now."
                : "No PO orders tracked yet. Link a purchase to a PO order from Add Purchase to start tracking."}
            </CardContent>
          </Card>
        ) : (
          ordersGrouped.map((items) => {
            const header = items[0]
            return (
              <Card key={header.po_order_id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {channelIcon(header.po_channel)}
                      <span>{header.shop_name || "Unknown seller"}</span>
                      {header.po_reference && (
                        <span className="text-xs font-normal text-muted-foreground">{header.po_reference}</span>
                      )}
                      {header.po_source_link && (
                        <a
                          href={header.po_source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open original PO post"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {header.po_eta && `ETA ${header.po_eta}`}
                      {header.po_close_date && ` · closes ${header.po_close_date}`}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-t first:border-t-0">
                      {orderTab === "pending" && (
                        <Checkbox
                          checked={selectedPendingIds.has(item.id)}
                          onCheckedChange={() => togglePendingSelected(item.id)}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          {item.item_no ? `${item.item_no} — ` : ""}
                          {item.collection_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {variantLabel(item.variant_status)}
                          {packagingLabel(item.packaging_type) && ` · ${packagingLabel(item.packaging_type)}`}
                          {item.quantity > 1 && ` · RM ${item.price_per_unit.toFixed(2)}/unit`}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">RM {item.total_price.toFixed(2)}</span>
                        {item.quantity > 1 && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground align-middle">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      <StageBadge row={item} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStatusModalItem({
                            id: item.id,
                            collectionName: item.collection_name,
                            totalPrice: item.total_price,
                            paymentStatus: item.payment_status,
                            amountPaid: item.amount_paid,
                            paymentDate: item.payment_date,
                            paymentMethod: item.payment_method,
                            readyDate: item.ready_date,
                            pickupDeadline: item.pickup_deadline,
                            collectedDate: item.collected_date,
                          })
                        }
                      >
                        Update
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })
        )}
        </div>
      </div>

      <PoStatusModal
        item={statusModalItem}
        onOpenChange={(open) => !open && setStatusModalItem(null)}
        onSuccess={fetchRows}
      />

      {bulkCollectTarget && (
        <BulkCollectDialog
          shopName={bulkCollectTarget.shopName}
          items={bulkCollectTarget.ids
            .map((id): BulkCollectItem | null => {
              const row = rows.find((r) => r.id === id)
              if (!row) return null
              return {
                id: row.id,
                label: row.item_no ? `${row.item_no} — ${row.collection_name}` : row.collection_name,
                totalPrice: row.total_price,
              }
            })
            .filter((item): item is BulkCollectItem => item !== null)}
          onOpenChange={(open) => !open && setBulkCollectTarget(null)}
          onConfirm={(paymentMethod) => handleMarkCollected(bulkCollectTarget.ids, paymentMethod)}
        />
      )}

      {bulkPaymentTarget && (
        <BulkStatusUpdateDialog
          items={bulkPaymentTarget
            .map((id): BulkStatusUpdateItem | null => {
              const row = rows.find((r) => r.id === id)
              if (!row) return null
              return {
                id: row.id,
                label: row.item_no ? `${row.item_no} — ${row.collection_name}` : row.collection_name,
                totalPrice: row.total_price,
              }
            })
            .filter((item): item is BulkStatusUpdateItem => item !== null)}
          onOpenChange={(open) => !open && setBulkPaymentTarget(null)}
          onConfirm={handleBulkStatusUpdate}
        />
      )}
    </div>
  )
}
