"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DISPOSAL_ROUTES, isRealisedSale, netProfit } from "@/lib/disposal"
import type { ReasonCount, MonthProfit } from "./insight-charts"

/* amCharts touches the DOM at construction, so it never renders on the server. */
const ReasonBarChart = dynamic(
  () => import("./insight-charts").then((m) => m.ReasonBarChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const ProfitColumnChart = dynamic(
  () => import("./insight-charts").then((m) => m.ProfitColumnChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

function ChartSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted" />
}

interface Row {
  quantity: number
  reason: string
  status: string
  paymentStatus: string | null
  grossAmount: number
  postageOut: number
  fees: number
  costPerUnit: number
  disposalDate: string | null
}

function formatPrice(value: number): string {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const MONTHS_SHOWN = 6

export function InsightView() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("tbl_disposal")
        .select(
          `quantity, reason, status, payment_status, gross_amount, postage_out,
           fees, disposal_date, tbl_purchase ( price_per_unit )`
        )

      if (error) throw error

      /* eslint-disable @typescript-eslint/no-explicit-any */
      setRows(
        (data ?? []).map((d: any) => ({
          quantity: Number(d.quantity ?? 1),
          reason: d.reason ?? "sold",
          status: d.status ?? "active",
          paymentStatus: d.payment_status ?? null,
          grossAmount: Number(d.gross_amount ?? 0),
          postageOut: Number(d.postage_out ?? 0),
          fees: Number(d.fees ?? 0),
          costPerUnit: Number(d.tbl_purchase?.price_per_unit ?? 0),
          disposalDate: d.disposal_date ?? null,
        }))
      )
      /* eslint-enable @typescript-eslint/no-explicit-any */
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load"
      setError(message)
      toast.error(`Error loading insight: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  /* Returned records are excluded everywhere here — a refused COD parcel came
   * back, so nothing actually left and nothing was earned. */
  const active = useMemo(() => rows.filter((r) => r.status === "active"), [rows])

  const stats = useMemo(() => {
    let unitsGone = 0
    let realisedProfit = 0
    let grossTaken = 0
    let sellingCosts = 0
    let pending = 0
    let soldUnits = 0

    for (const r of active) {
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
      if (isRealisedSale(money)) {
        realisedProfit += netProfit(money, r.costPerUnit)
        grossTaken += r.grossAmount
        sellingCosts += r.postageOut + r.fees
        soldUnits += r.quantity
      } else if (r.reason === "sold" && r.paymentStatus === "pending") {
        pending += 1
      }
    }

    return { unitsGone, realisedProfit, grossTaken, sellingCosts, pending, soldUnits }
  }, [active])

  const reasonData: ReasonCount[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of active) {
      counts.set(r.reason, (counts.get(r.reason) ?? 0) + r.quantity)
    }
    /* Walk the known reasons so the order is stable and nothing unexpected in
     * the data invents a category. */
    return DISPOSAL_ROUTES.map((route) => ({
      label: route.label,
      count: counts.get(route.reason) ?? 0,
    })).filter((d) => d.count > 0)
  }, [active])

  const profitData: MonthProfit[] = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const r of active) {
      const money = {
        quantity: r.quantity,
        reason: r.reason,
        status: r.status,
        paymentStatus: r.paymentStatus,
        grossAmount: r.grossAmount,
        postageOut: r.postageOut,
        fees: r.fees,
      }
      if (!isRealisedSale(money) || !r.disposalDate) continue
      const d = new Date(r.disposalDate)
      if (Number.isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      byMonth.set(key, (byMonth.get(key) ?? 0) + netProfit(money, r.costPerUnit))
    }

    /* Zero-fill so a quiet month shows as a gap, not as a missing column. */
    const out: MonthProfit[] = []
    const now = new Date()
    for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      out.push({
        month: d.toLocaleDateString("en-MY", { month: "short" }),
        profit: Math.round((byMonth.get(key) ?? 0) * 100) / 100,
      })
    }
    return out
  }, [active])

  const hasProfitHistory = profitData.some((d) => d.profit !== 0)

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

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-20 text-center">
        <p className="font-medium">Nothing has left your collection yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Once you record a gift or a sale, the numbers appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cars gone" value={String(stats.unitsGone)} hint="All reasons" />
        <Stat
          label="Profit from sales"
          value={formatPrice(stats.realisedProfit)}
          hint="After postage and fees"
          negative={stats.realisedProfit < 0}
        />
        <Stat
          label="Money taken"
          value={formatPrice(stats.grossTaken)}
          hint={`${formatPrice(stats.sellingCosts)} went on postage and fees`}
        />
        <Stat
          label="Waiting for money"
          value={String(stats.pending)}
          hint="COD not yet received"
        />
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Where the cars went</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          {stats.unitsGone} car{stats.unitsGone === 1 ? "" : "s"} have left, by reason
        </p>
        <ReasonBarChart data={reasonData} />
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Profit by month</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Last {MONTHS_SHOWN} months. Only settled sales count — gifts never appear
          here, and a COD still waiting for payment is left out until the money
          arrives.
        </p>
        {hasProfitHistory ? (
          <ProfitColumnChart data={profitData} />
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No settled sales in the last {MONTHS_SHOWN} months.
          </p>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-3 font-semibold">The numbers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 text-right font-medium">Cars</th>
                <th className="pb-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {reasonData.map((d) => (
                <tr key={d.label} className="border-b last:border-0">
                  <td className="py-2">{d.label}</td>
                  <td className="py-2 text-right tabular-nums">{d.count}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {stats.unitsGone === 0
                      ? "—"
                      : `${Math.round((d.count / stats.unitsGone) * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  negative = false,
}: {
  label: string
  value: string
  hint?: string
  negative?: boolean
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", negative && "text-destructive")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
