"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, TrendingUp, Calendar, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { DateTime } from "luxon"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
import type { SortedBarDatum } from "@/components/charts/sorted-bar-chart"

/* amCharts touches the DOM at construction, so it never renders on the server. */
const SortedBarChart = dynamic(
  () => import("@/components/charts/sorted-bar-chart").then((m) => m.SortedBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted" />,
  }
)

interface StatData {
  title: string
  value: string
  description: string
  icon: any
  trend: string
  isLoading: boolean
}

interface RecentPurchase {
  id: string
  collection_name: string
  packaging_type: string | null
  total_price: number
  payment_date: string | null
  created_at: string
}

interface TopBrand {
  brand_id: number
  brand_name: string
  total_spent: number
  percentage: number
}

/**
 * Helper function to format date using Luxon
 * Formats the date in the specified timezone, showing "today" if the date is today
 * 
 * @param dateString - Date string in YYYY-MM-DD format (stored as DATE in database)
 * @param timezone - IANA timezone identifier (defaults to 'Asia/Kuala_Lumpur')
 * @param format - Date format string (defaults to 'dd MMM yyyy' e.g., "15 Jan 2024")
 * @param fallbackText - Text to return when dateString is null (defaults to 'No payment date')
 * @returns Formatted date string or "today" if the date is today
 */
function formatDate(
  dateString: string | null,
  timezone: string = 'Asia/Kuala_Lumpur',
  format: string = 'dd MMM yyyy',
  fallbackText: string = 'No payment date'
): string {
  if (!dateString) return fallbackText
  
  // Parse date string and set to specified timezone
  const date = DateTime.fromISO(dateString, { zone: timezone })
    .startOf('day')
  
  // Get current date in specified timezone
  const now = DateTime.now().setZone(timezone).startOf('day')
  
  // Check if the date is today
  if (date.hasSame(now, 'day')) {
    return 'Today'
  }
  
  // Format the date
  return date.toFormat(format)
}

export default function DashboardPage() {
  const supabase = createClient()
  
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [stats, setStats] = useState<StatData[]>([
    {
      title: "Total Spent",
      value: "RM 0.00",
      description: "All time expenses",
      icon: DollarSign,
      trend: "Loading...",
      isLoading: true,
    },
    {
      title: "Total Items",
      value: "0",
      description: "Diecast models purchased",
      icon: Package,
      trend: "Loading...",
      isLoading: true,
    },
    {
      title: "Average Price",
      value: "RM 0.00",
      description: "Per item",
      icon: TrendingUp,
      trend: "Loading...",
      isLoading: true,
    },
    {
      title: "This Month",
      value: "RM 0.00",
      description: "Current month spending",
      icon: Calendar,
      trend: "Loading...",
      isLoading: true,
    },
  ])

  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([])
  const [isLoadingRecentPurchases, setIsLoadingRecentPurchases] = useState(true)

  const [topBrands, setTopBrands] = useState<TopBrand[]>([])
  const [isLoadingTopBrands, setIsLoadingTopBrands] = useState(true)

  /*
   * Handle reload all dashboard data
   */
  const handleReload = () => {
    setIsRefreshing(true)
    
    // Reset all loading states
    setStats(prev => prev.map(stat => ({ ...stat, isLoading: true, value: "Loading...", trend: "Loading..." })))
    setIsLoadingRecentPurchases(true)
    setIsLoadingTopBrands(true)
    
    // Trigger re-fetch by updating refreshKey
    setRefreshKey(prev => prev + 1)
    
    toast.success("Dashboard refreshed!")
    
    // Reset refresh button after a short delay
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  /*
   * Fetch total spent from all purchases
   */
  useEffect(() => {
    const fetchTotalSpent = async () => {
      try {
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select("amount_paid")

        if (error) throw error

        const total = data?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 0

        setStats(prev => prev.map((stat, idx) =>
          idx === 0
            ? { 
                ...stat, 
                value: `RM ${total.toFixed(2)}`, 
                trend: `${data?.length || 0} purchases`,
                isLoading: false 
              }
            : stat
        ))
      } catch (error) {
        console.error("Error fetching total spent:", error)
        setStats(prev => prev.map((stat, idx) => 
          idx === 0 ? { ...stat, value: "Error", trend: "Failed to load", isLoading: false } : stat
        ))
      }
    }

    fetchTotalSpent()
  }, [supabase, refreshKey])

  /*
   * Fetch total items (quantity from paid purchases)
   */
  useEffect(() => {
    const fetchTotalItems = async () => {
      try {
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select("quantity, payment_status")
          .eq("payment_status", "paid")

        if (error) throw error

        const purchasedQty = data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

        /* Cars that left the collection — gifted, sold or lost — are no longer
         * items on the shelf, even though the money spent on them stays in
         * "Total Spent". Returned COD parcels came back, so they don't count. */
        const { data: disposalData, error: disposalError } = await supabase
          .from("tbl_disposal")
          .select("quantity, status")
          .eq("status", "active")

        if (disposalError) throw disposalError

        const disposedQty =
          disposalData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

        const totalQty = Math.max(purchasedQty - disposedQty, 0)

        // Get this month's items for trend
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        
        const { data: monthData } = await supabase
          .from("tbl_purchase")
          .select("quantity, payment_date")
          .eq("payment_status", "paid")
          .gte("payment_date", `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)

        const monthQty = monthData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

        setStats(prev => prev.map((stat, idx) => 
          idx === 1 
            ? { 
                ...stat, 
                value: totalQty.toString(), 
                trend: `+${monthQty} this month`,
                isLoading: false 
              }
            : stat
        ))
      } catch (error) {
        console.error("Error fetching total items:", error)
        setStats(prev => prev.map((stat, idx) => 
          idx === 1 ? { ...stat, value: "Error", trend: "Failed to load", isLoading: false } : stat
        ))
      }
    }

    fetchTotalItems()
  }, [supabase, refreshKey])

  /*
   * Fetch average price per unit
   */
  useEffect(() => {
    const fetchAveragePrice = async () => {
      try {
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select("price_per_unit")
          .eq("payment_status", "paid")

        if (error) throw error

        const total = data?.reduce((sum, item) => sum + (item.price_per_unit || 0), 0) || 0
        const count = data?.length || 1
        const average = total / count

        setStats(prev => prev.map((stat, idx) => 
          idx === 2 
            ? { 
                ...stat, 
                value: `RM ${average.toFixed(2)}`, 
                trend: `Based on ${count} purchases`,
                isLoading: false 
              }
            : stat
        ))
      } catch (error) {
        console.error("Error fetching average price:", error)
        setStats(prev => prev.map((stat, idx) => 
          idx === 2 ? { ...stat, value: "Error", trend: "Failed to load", isLoading: false } : stat
        ))
      }
    }

    fetchAveragePrice()
  }, [supabase, refreshKey])

  /*
   * Fetch current month spending
   */
  useEffect(() => {
    const fetchThisMonthSpending = async () => {
      try {
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
        
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select("amount_paid, quantity, payment_date")
          .gte("payment_date", startOfMonth)

        if (error) throw error

        const total = data?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 0
        const items = data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

        setStats(prev => prev.map((stat, idx) => 
          idx === 3 
            ? { 
                ...stat, 
                value: `RM ${total.toFixed(2)}`, 
                trend: `${items} items`,
                isLoading: false 
              }
            : stat
        ))
      } catch (error) {
        console.error("Error fetching month spending:", error)
        setStats(prev => prev.map((stat, idx) => 
          idx === 3 ? { ...stat, value: "Error", trend: "Failed to load", isLoading: false } : stat
        ))
      }
    }

    fetchThisMonthSpending()
  }, [supabase, refreshKey])

  /*
   * Fetch recent purchases (top 5)
   */
  useEffect(() => {
    const fetchRecentPurchases = async () => {
      try {
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select(`
            id,
            total_price,
            packaging_type,
            payment_date,
            tbl_collection!inner(
              name
            )
          `)
          .not("payment_date", "is", null)
          .order("payment_date", { ascending: false })
          .limit(8)

        if (error) throw error

        const purchases: RecentPurchase[] = (data || []).map((item: any) => ({
          id: item.id,
          collection_name: item.tbl_collection.name,
          packaging_type: item.packaging_type,
          total_price: item.total_price,
          payment_date: item.payment_date,
          created_at: item.payment_date, // Use payment_date for display
        }))

        setRecentPurchases(purchases)
      } catch (error) {
        console.error("Error fetching recent purchases:", error)
      } finally {
        setIsLoadingRecentPurchases(false)
      }
    }

    fetchRecentPurchases()
  }, [supabase, refreshKey])

  /*
   * Fetch all brands by spending
   */
  useEffect(() => {
    const fetchTopBrands = async () => {
      try {
        // First, get total spending to calculate percentages
        const { data: allPurchases } = await supabase
          .from("tbl_purchase")
          .select("amount_paid")

        const totalSpending = allPurchases?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 1

        // Get spending by brand
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select(`
            amount_paid,
            tbl_collection!inner(
              brand_id,
              tbl_master_brand!inner(
                id,
                name
              )
            )
          `)

        if (error) throw error

        /*
         * Group by brand and calculate total spending
         */
        const brandMap = new Map<number, { name: string; total: number }>()

        data?.forEach((item: any) => {
          const brandId = item.tbl_collection.brand_id
          const brandName = item.tbl_collection.tbl_master_brand.name
          const price = item.amount_paid || 0

          if (brandMap.has(brandId)) {
            brandMap.get(brandId)!.total += price
          } else {
            brandMap.set(brandId, { name: brandName, total: price })
          }
        })

        /*
         * Convert to array and sort by total spending (show all brands)
         */
        const brandsArray: TopBrand[] = Array.from(brandMap.entries())
          .map(([brandId, data]) => ({
            brand_id: brandId,
            brand_name: data.name,
            total_spent: data.total,
            percentage: (data.total / totalSpending) * 100,
          }))
          .sort((a, b) => b.total_spent - a.total_spent)

        setTopBrands(brandsArray)
      } catch (error) {
        console.error("Error fetching top brands:", error)
      } finally {
        setIsLoadingTopBrands(false)
      }
    }

    fetchTopBrands()
  }, [supabase, refreshKey])

  /* topBrands already arrives sorted by spend; the chart sorts again anyway so
   * the ordering is guaranteed by the component rather than by its caller. */
  const brandChartData: SortedBarDatum[] = useMemo(
    () => topBrands.map((b) => ({ label: b.brand_name, value: b.total_spent })),
    [topBrands]
  )

  const brandShareByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of topBrands) map.set(b.brand_name, b.percentage)
    return map
  }, [topBrands])

  /* Stable identities — the chart rebuilds whenever these change. */
  const formatRinggit = useCallback(
    (value: number) =>
      `RM ${value.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    []
  )

  const formatBrandShare = useCallback(
    (d: SortedBarDatum) => {
      const share = brandShareByName.get(d.label)
      return share == null ? null : `${share.toFixed(1)}% of spend`
    },
    [brandShareByName]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn("text-3xl font-bold tracking-tight", tw.textTitle)}>Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your diecast collection expenses
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReload}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-medium", tw.textTitle)}>
                  {stat.title}
                </CardTitle>
                {stat.isLoading ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                {stat.isLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-muted animate-pulse rounded w-24"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
                  </div>
                ) : (
                  <>
                    <div className={cn("text-2xl font-bold", tw.textTitle)}>{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.trend}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Spending by Brand gets the full width: the bar chart needs the room
          for long brand names, and it reads as the headline of the page.
          Recent Purchases sits below it. */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className={tw.textTitle}>Spending by Brand</CardTitle>
            <CardDescription>
              Total expenses tracked by brand, biggest first
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTopBrands ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                      <div className="h-2 bg-muted animate-pulse rounded w-32"></div>
                    </div>
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : topBrands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No brand data yet</p>
              </div>
            ) : (
              /* The chart sizes itself to the brand count, so with many brands
               * this container scrolls rather than the bars being squashed. */
              <div className={cn("max-h-[520px] overflow-y-auto pr-2", tw.scrollbarDark)}>
                <SortedBarChart
                  data={brandChartData}
                  formatValue={formatRinggit}
                  formatSubLabel={formatBrandShare}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={tw.textTitle}>Recent Purchases</CardTitle>
            <CardDescription>
              Your latest diecast acquisitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecentPurchases ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                      <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
                    </div>
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : recentPurchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No purchases yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPurchases.map((purchase) => {
                  const displayDate = formatDate(purchase.payment_date)
                  
                  return (
                    <div key={purchase.id} className="flex items-center justify-between">
                      <div>
                        <p className={cn("text-sm font-medium", tw.textTitle)}>{purchase.collection_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {purchase.packaging_type 
                            ? purchase.packaging_type.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')
                            : 'Standard'
                          } • {displayDate}
                        </p>
                      </div>
                      <p className={cn("text-sm font-semibold", tw.textTitle)}>RM {purchase.total_price.toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
