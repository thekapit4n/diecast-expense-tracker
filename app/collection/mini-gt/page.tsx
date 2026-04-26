"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react"
import { createClient } from "@/lib/supabase/client"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, GripHorizontal, ImagePlus, Loader2, RefreshCw, Search, X } from "lucide-react"
import { toast } from "sonner"

interface MiniGtCollectionItem {
  id: string
  name: string
  item_no: string | null
  brand_name: string
  scale: string | null
  remark: string | null
  imageUrls: string[]
  purchaseCount: number
  totalOwnedQuantity: number
  totalSpent: number
}

interface CollectionQueryRow {
  id: string
  name: string
  item_no: string | null
  scale: string | null
  remark: string | null
  tbl_master_brand?: {
    name: string
  } | Array<{ name: string }> | null
}

interface PurchaseQueryRow {
  collection_id: string | null
  quantity: number | string | null
  total_price: number | string | null
}

interface ImportPayload {
  series: string
  importedCount: number
}

const INITIAL_VISIBLE_ITEMS = 9
const LOAD_MORE_BATCH = 6

export default function MiniGtCollectionPage() {
  const supabase = createClient()
  const [items, setItems] = useState<MiniGtCollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedItem, setSelectedItem] = useState<MiniGtCollectionItem | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isCarouselExpanded, setIsCarouselExpanded] = useState(false)
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set())
  const [resolvedImageUrls, setResolvedImageUrls] = useState<Set<string>>(new Set())
  const [hasAppliedInitialOpen, setHasAppliedInitialOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importSeries, setImportSeries] = useState("")
  const [importUrl, setImportUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importModalPosition, setImportModalPosition] = useState({ x: 32, y: 88 })
  const [isDraggingImportModal, setIsDraggingImportModal] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_VISIBLE_ITEMS)
  const [itemImageVersionMap, setItemImageVersionMap] = useState<Record<string, number>>({})
  const importModalRef = useRef<HTMLDivElement | null>(null)
  const listLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const carouselTouchStartXRef = useRef<number | null>(null)
  const carouselTouchStartYRef = useRef<number | null>(null)

  const extractImageUrls = (remark: string | null): string[] => {
    if (!remark) return []

    const matches = remark.match(/(?:https?:\/\/\S+|\/api\/\S+)\.(?:png|jpe?g|webp|gif)/gi)
    return matches ? matches.map((url) => url.trim()) : []
  }

  const getLocalSeriesImages = (itemNo: string | null): string[] => {
    if (!itemNo) return []

    const normalizedSeries = itemNo.trim().toUpperCase()
    const detectedSeries = normalizedSeries.match(/MGT\d+/)?.[0] || normalizedSeries
    return Array.from({ length: 12 }, (_, index) => `/api/mini-gt/image/${detectedSeries}/${index + 1}.jpg`)
  }

  const fetchMiniGtCollection = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: collectionData, error: collectionError }, { data: purchaseData, error: purchaseError }] = await Promise.all([
        supabase
          .from("tbl_collection")
          .select(`
            id,
            name,
            item_no,
            scale,
            remark,
            tbl_master_brand(name)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("tbl_purchase")
          .select("collection_id, quantity, total_price"),
      ])

      if (collectionError) throw collectionError
      if (purchaseError) throw purchaseError

      const purchaseSummaryMap = new Map<string, { purchaseCount: number; totalOwnedQuantity: number; totalSpent: number }>()

      ;((purchaseData || []) as PurchaseQueryRow[]).forEach((purchase) => {
        if (!purchase.collection_id) return

        const existingSummary = purchaseSummaryMap.get(purchase.collection_id) || {
          purchaseCount: 0,
          totalOwnedQuantity: 0,
          totalSpent: 0,
        }

        existingSummary.purchaseCount += 1
        existingSummary.totalOwnedQuantity += Number(purchase.quantity || 0)
        existingSummary.totalSpent += Number(purchase.total_price || 0)

        purchaseSummaryMap.set(purchase.collection_id, existingSummary)
      })

      const formatted = ((collectionData || []) as CollectionQueryRow[])
        .map((item) => {
          const brand =
            Array.isArray(item.tbl_master_brand)
              ? item.tbl_master_brand[0]
              : item.tbl_master_brand
          const purchaseSummary = purchaseSummaryMap.get(item.id) || {
            purchaseCount: 0,
            totalOwnedQuantity: 0,
            totalSpent: 0,
          }

          return {
            id: item.id,
            name: item.name,
            item_no: item.item_no,
            scale: item.scale,
            remark: item.remark,
            brand_name: brand?.name || "",
            imageUrls: [
              ...getLocalSeriesImages(item.item_no),
              ...extractImageUrls(item.remark),
            ],
            purchaseCount: purchaseSummary.purchaseCount,
            totalOwnedQuantity: purchaseSummary.totalOwnedQuantity,
            totalSpent: purchaseSummary.totalSpent,
          }
        })
        .filter((item) => item.brand_name.toLowerCase().includes("mini gt"))

      setItems(formatted)
    } catch (error) {
      console.error("Error fetching Mini GT collection:", error)
      toast.error("Failed to load Mini GT collection")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMiniGtCollection()
  }, [fetchMiniGtCollection])

  useEffect(() => {
    if (hasAppliedInitialOpen || loading || items.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const itemNoQuery = params.get("itemNo")
    const shouldOpen = params.get("open") === "1"

    if (!itemNoQuery || !shouldOpen) {
      setHasAppliedInitialOpen(true)
      return
    }

    const normalizedItemNo = itemNoQuery.trim().toUpperCase()
    const targetItem = items.find((item) => (item.item_no || "").trim().toUpperCase() === normalizedItemNo)

    if (targetItem) {
      setSelectedItem(targetItem)
      setSelectedImageIndex(0)
      setSearch(normalizedItemNo)
    } else {
      toast.info(`Mini GT model ${normalizedItemNo} not found in collection.`)
    }

    setHasAppliedInitialOpen(true)
  }, [hasAppliedInitialOpen, items, loading])

  const filteredItems = useMemo(() => {
    const getSeriesSortValue = (itemNo: string | null): { prefix: string; number: number } => {
      if (!itemNo) {
        return { prefix: "zzz", number: Number.MAX_SAFE_INTEGER }
      }

      const normalized = itemNo.trim().toUpperCase()
      const match = normalized.match(/^([A-Z]+)?\s*0*([0-9]+)/)

      if (!match) {
        return { prefix: normalized, number: Number.MAX_SAFE_INTEGER - 1 }
      }

      return {
        prefix: match[1] || "",
        number: Number(match[2]),
      }
    }

    const keyword = search.trim().toLowerCase()
    const searchResult = !keyword
      ? items
      : items.filter((item) =>
          [item.name, item.item_no, item.brand_name, item.scale, item.remark]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        )

    return [...searchResult].sort((a, b) => {
      const seriesA = getSeriesSortValue(a.item_no)
      const seriesB = getSeriesSortValue(b.item_no)

      if (seriesA.prefix !== seriesB.prefix) {
        return seriesA.prefix.localeCompare(seriesB.prefix)
      }

      if (seriesA.number !== seriesB.number) {
        return seriesA.number - seriesB.number
      }

      return a.name.localeCompare(b.name)
    })
  }, [items, search])

  useEffect(() => {
    setVisibleItemCount(INITIAL_VISIBLE_ITEMS)
  }, [search, items.length])

  useEffect(() => {
    if (loading) return
    if (visibleItemCount >= filteredItems.length) return

    const target = listLoadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting) return
        setVisibleItemCount((previous) => Math.min(previous + LOAD_MORE_BATCH, filteredItems.length))
      },
      {
        root: null,
        rootMargin: "160px 0px",
        threshold: 0.1,
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [filteredItems.length, loading, visibleItemCount])

  const visibleItems = useMemo(
    () => filteredItems.slice(0, Math.min(visibleItemCount, filteredItems.length)),
    [filteredItems, visibleItemCount]
  )
  const hasMoreItems = visibleItemCount < filteredItems.length
  const withCacheBuster = useCallback((url: string, itemId?: string) => {
    if (!itemId) return url
    const version = itemImageVersionMap[itemId]
    if (!version) return url
    const delimiter = url.includes("?") ? "&" : "?"
    return `${url}${delimiter}v=${version}`
  }, [itemImageVersionMap])

  const handleCarouselTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    carouselTouchStartXRef.current = touch.clientX
    carouselTouchStartYRef.current = touch.clientY
  }

  const handleCarouselTouchEnd = (
    event: ReactTouchEvent<HTMLDivElement>,
    total: number,
    selectedIndex: number,
    updateIndex: (nextIndex: number) => void
  ) => {
    if (total <= 1) return

    const touch = event.changedTouches[0]
    if (!touch || carouselTouchStartXRef.current === null || carouselTouchStartYRef.current === null) return

    const deltaX = touch.clientX - carouselTouchStartXRef.current
    const deltaY = touch.clientY - carouselTouchStartYRef.current
    const minimumSwipeDistance = 36

    carouselTouchStartXRef.current = null
    carouselTouchStartYRef.current = null

    if (Math.abs(deltaX) < minimumSwipeDistance || Math.abs(deltaX) <= Math.abs(deltaY)) return
    if (deltaX < 0) {
      updateIndex((selectedIndex + 1 + total) % total)
      return
    }
    updateIndex((selectedIndex - 1 + total) % total)
  }

  useEffect(() => {
    if (!selectedItem) {
      setIsCarouselExpanded(false)
      return
    }

    setIsCarouselExpanded(false)
    const timer = setTimeout(() => {
      setIsCarouselExpanded(true)
    }, 80)

    return () => clearTimeout(timer)
  }, [selectedItem])

  useEffect(() => {
    if (!selectedItem) return
    const availableUrls = selectedItem.imageUrls.filter((url) => !failedImageUrls.has(url))
    if (availableUrls.length === 0) {
      if (selectedImageIndex !== 0) setSelectedImageIndex(0)
      return
    }

    if (selectedImageIndex >= availableUrls.length) {
      setSelectedImageIndex(0)
    }
  }, [selectedItem, selectedImageIndex, failedImageUrls])

  const markImageAsFailed = (url: string) => {
    setFailedImageUrls((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }

  const markImageAsResolved = (url: string) => {
    setResolvedImageUrls((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }

  const refreshSeriesItem = async (safeSeries: string) => {
    const { data: collectionItem, error: collectionError } = await supabase
      .from("tbl_collection")
      .select(`
        id,
        name,
        item_no,
        scale,
        remark,
        tbl_master_brand(name)
      `)
      .ilike("item_no", `${safeSeries}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (collectionError) throw collectionError
    if (!collectionItem?.id) return false

    const { data: purchases, error: purchaseError } = await supabase
      .from("tbl_purchase")
      .select("collection_id, quantity, total_price")
      .eq("collection_id", collectionItem.id)

    if (purchaseError) throw purchaseError

    const purchaseSummary = (purchases || []).reduce(
      (summary, purchase) => {
        summary.purchaseCount += 1
        summary.totalOwnedQuantity += Number(purchase.quantity || 0)
        summary.totalSpent += Number(purchase.total_price || 0)
        return summary
      },
      { purchaseCount: 0, totalOwnedQuantity: 0, totalSpent: 0 }
    )

    const brand = Array.isArray(collectionItem.tbl_master_brand)
      ? collectionItem.tbl_master_brand[0]
      : collectionItem.tbl_master_brand

    const refreshedItem: MiniGtCollectionItem = {
      id: collectionItem.id,
      name: collectionItem.name,
      item_no: collectionItem.item_no,
      scale: collectionItem.scale,
      remark: collectionItem.remark,
      brand_name: brand?.name || "",
      imageUrls: [
        ...getLocalSeriesImages(collectionItem.item_no),
        ...extractImageUrls(collectionItem.remark),
      ],
      purchaseCount: purchaseSummary.purchaseCount,
      totalOwnedQuantity: purchaseSummary.totalOwnedQuantity,
      totalSpent: purchaseSummary.totalSpent,
    }

    setItems((prev) => prev.map((item) => (item.id === refreshedItem.id ? refreshedItem : item)))
    setSelectedItem((prev) => (prev?.id === refreshedItem.id ? refreshedItem : prev))
    setFailedImageUrls((prev) => {
      const next = new Set(prev)
      refreshedItem.imageUrls.forEach((url) => next.delete(url))
      return next
    })
    setResolvedImageUrls((prev) => {
      const next = new Set(prev)
      refreshedItem.imageUrls.forEach((url) => next.delete(url))
      return next
    })
    return true
  }

  const refreshImagePreview = async () => {
    if (!selectedItem?.item_no) {
      toast.info("No selected Mini GT model to refresh.")
      return
    }

    const selectedItemId = selectedItem.id
    const selectedItemUrls = selectedItem.imageUrls
    setFailedImageUrls((prev) => {
      const next = new Set(prev)
      selectedItemUrls.forEach((url) => next.delete(url))
      return next
    })
    setResolvedImageUrls((prev) => {
      const next = new Set(prev)
      selectedItemUrls.forEach((url) => next.delete(url))
      return next
    })
    setItemImageVersionMap((prev) => ({
      ...prev,
      [selectedItemId]: Date.now(),
    }))

    const normalizedSeries = selectedItem.item_no.trim().toUpperCase().match(/MGT\d+/)?.[0] || selectedItem.item_no.trim().toUpperCase()
    const hasRefreshedCard = await refreshSeriesItem(normalizedSeries)
    if (!hasRefreshedCard) {
      toast.error(`Unable to refresh ${normalizedSeries} card.`)
      return
    }

    toast.success(`${normalizedSeries} images refreshed`)
  }

  const openImportModal = (presetSeries?: string | null) => {
    const modalWidth = Math.min(window.innerWidth * 0.92, 520)
    const modalHeight = 280
    const centeredX = Math.max(12, (window.innerWidth - modalWidth) / 2)
    const centeredY = Math.max(12, (window.innerHeight - modalHeight) / 2)
    const normalizedSeries = (presetSeries || "").trim().toUpperCase().match(/MGT\d{5}/)?.[0] || ""
    setImportSeries(normalizedSeries)
    setImportUrl("")
    setImportModalPosition({ x: centeredX, y: centeredY })
    setIsImportModalOpen(true)
  }

  const closeImportModal = () => {
    if (isImporting) return
    setIsImportModalOpen(false)
    setIsDraggingImportModal(false)
  }

  const getBoundedPosition = useCallback((nextX: number, nextY: number) => {
    const modalRect = importModalRef.current?.getBoundingClientRect()
    const modalWidth = modalRect?.width ?? 520
    const modalHeight = modalRect?.height ?? 240
    const maxX = Math.max(12, window.innerWidth - modalWidth - 12)
    const maxY = Math.max(12, window.innerHeight - modalHeight - 12)

    return {
      x: Math.min(Math.max(12, nextX), maxX),
      y: Math.min(Math.max(12, nextY), maxY),
    }
  }, [])

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isImportModalOpen) return
    event.preventDefault()
    setIsDraggingImportModal(true)
    setDragOffset({
      x: event.clientX - importModalPosition.x,
      y: event.clientY - importModalPosition.y,
    })
  }

  useEffect(() => {
    if (!isDraggingImportModal) return

    const handlePointerMove = (event: PointerEvent) => {
      const bounded = getBoundedPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y)
      setImportModalPosition(bounded)
    }

    const stopDragging = () => {
      setIsDraggingImportModal(false)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopDragging)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopDragging)
    }
  }, [dragOffset.x, dragOffset.y, getBoundedPosition, isDraggingImportModal])

  const handleImportSubmit = async (mode: "done" | "addNew") => {
    const safeSeries = importSeries.trim().toUpperCase()
    const safeUrl = importUrl.trim()

    if (!safeSeries || !safeUrl) {
      toast.error("Series and product URL are required")
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch("/api/management/mini-gt-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: safeSeries,
          productUrl: safeUrl,
        }),
      })

      const payload = (await response.json()) as Partial<ImportPayload> & { error?: string }
      if (!response.ok) {
        toast.error(payload.error || "Import failed")
        return
      }

      toast.success(`Imported ${payload.importedCount} images for ${payload.series}`)
      const hasRefreshedCard = await refreshSeriesItem(safeSeries)
      if (!hasRefreshedCard) {
        await fetchMiniGtCollection()
      }

      if (mode === "addNew") {
        setImportSeries("")
        setImportUrl("")
        return
      }

      setIsImportModalOpen(false)
    } catch (error) {
      console.error("Image import failed:", error)
      toast.error("Unexpected import error")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mini GT Collection</h1>
        <p className="text-muted-foreground">
          Catalog-style list of Mini GT models you already own.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>My Mini GT</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => openImportModal()}
                disabled={isImporting}
                aria-label="Open Mini GT image import"
                className="h-8 w-8"
              >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fetchMiniGtCollection()}
                disabled={loading}
                aria-label="Reload Mini GT list"
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          <div>
            <CardDescription>
              Search your owned Mini GT models and open matching catalog pages quickly.
            </CardDescription>
            {!loading ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing {Math.min(visibleItems.length, filteredItems.length)} of {filteredItems.length} item(s).
              </p>
            ) : null}
          </div>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by model name, item no, scale..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="h-32 w-full rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No Mini GT model found in your collection yet.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => {
                const availableItemImageUrls = item.imageUrls.filter((url) => !failedImageUrls.has(url))
                return (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item)
                          setSelectedImageIndex(0)
                        }}
                        className="group relative block w-full border-b bg-white"
                      >
                        {availableItemImageUrls.length > 0 ? (
                          <div className="relative aspect-[4/3] w-full overflow-hidden">
                            {!resolvedImageUrls.has(availableItemImageUrls[0]) ? (
                              <div className="absolute inset-0 animate-pulse bg-muted" />
                            ) : null}
                            <img
                              src={withCacheBuster(availableItemImageUrls[0], item.id)}
                              alt={`${item.name} thumbnail`}
                              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                              onLoad={() => markImageAsResolved(availableItemImageUrls[0])}
                              onError={() => {
                                markImageAsResolved(availableItemImageUrls[0])
                                markImageAsFailed(availableItemImageUrls[0])
                              }}
                            />
                          </div>
                        ) : (
                          <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-muted/30">
                            <div className="absolute inset-0 animate-pulse bg-muted/40" />
                            <p className="relative text-xs uppercase tracking-wide text-muted-foreground">
                              No image yet
                            </p>
                          </div>
                        )}
                      </button>
                      <div className="space-y-1 p-3">
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{item.name}</h3>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {item.item_no || "No Item No"}{item.scale ? ` • ${item.scale}` : ""}
                          </p>
                          {availableItemImageUrls.length === 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => openImportModal(item.item_no)}
                            >
                              <ImagePlus className="mr-1 h-3 w-3" />
                              Import Image
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
                })}
              </div>
              {hasMoreItems ? (
                <div className="mt-4 space-y-3">
                  <div ref={listLoadMoreRef} className="h-1 w-full" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: Math.min(LOAD_MORE_BATCH, filteredItems.length - visibleItems.length) }).map((_, index) => (
                      <div key={`mini-gt-load-more-${index}`} className="rounded-lg border p-4 space-y-3">
                        <div className="h-32 w-full rounded-md bg-muted animate-pulse" />
                        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Loading more... ({visibleItems.length}/{filteredItems.length})
                  </p>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {!loading && filteredItems.length > 0 ? (
        <div className="fixed bottom-4 right-4 z-30 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          Showing {Math.min(visibleItems.length, filteredItems.length)} / {filteredItems.length}
          {hasMoreItems ? " (scroll for more)" : ""}
        </div>
      ) : null}

      {isImportModalOpen ? (
        <div
          ref={importModalRef}
          className="fixed z-40 w-[min(92vw,520px)] rounded-xl border bg-background shadow-2xl"
          style={{
            left: importModalPosition.x,
            top: importModalPosition.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            onPointerDown={handleDragStart}
            className={`flex cursor-move items-center justify-between rounded-t-xl border-b px-4 py-3 ${isDraggingImportModal ? "select-none" : ""}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GripHorizontal className="h-4 w-4 text-muted-foreground" />
              Import Mini GT Images
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={closeImportModal}
              disabled={isImporting}
              aria-label="Close import modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Series</label>
              <Input
                value={importSeries}
                onChange={(event) => setImportSeries(event.target.value.toUpperCase())}
                placeholder="MGT00009"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product URL</label>
              <Input
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                placeholder="https://minigt.tsm-models.com/index.php?action=product-detail&id=9"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeImportModal} disabled={isImporting}>
                Cancel
              </Button>
              <div className="flex items-center">
                <Button type="button" onClick={() => handleImportSubmit("done")} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import + Done"
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      className="ml-1 h-10 w-10"
                      disabled={isImporting}
                      aria-label="Select import action"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleImportSubmit("addNew")}>
                      Import + Add New
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedItem ? (() => {
        const urls = selectedItem.imageUrls.filter((url) => !failedImageUrls.has(url))
        const total = urls.length
        const getWrappedIndex = (index: number) => {
          if (total === 0) return 0
          return (index + total) % total
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="relative w-full max-w-5xl overflow-visible rounded-3xl bg-gradient-to-b from-cyan-300 via-cyan-100 to-white"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-20 rounded-full bg-white/60 hover:bg-white"
                onClick={() => setSelectedItem(null)}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Coverflow carousel */}
              <div
                className="relative flex h-[320px] items-center justify-center overflow-hidden md:h-[420px]"
                style={{ perspective: "1200px" }}
                onTouchStart={handleCarouselTouchStart}
                onTouchEnd={(event) =>
                  handleCarouselTouchEnd(event, total, selectedImageIndex, (nextIndex) => setSelectedImageIndex(nextIndex))
                }
              >
                {total > 0 ? (
                  urls.map((url, imageIndex) => {
                    let relativePosition = imageIndex - selectedImageIndex
                    if (relativePosition > total / 2) relativePosition -= total
                    if (relativePosition < -total / 2) relativePosition += total

                    if (Math.abs(relativePosition) > 2) return null

                    const isCenter = relativePosition === 0
                    const isInteractive = relativePosition === -1 || relativePosition === 1

                    const slotClass =
                      relativePosition === 0
                        ? "z-30 w-80 md:w-[540px] opacity-100"
                        : Math.abs(relativePosition) === 1
                          ? "z-20 w-72 md:w-96 opacity-80"
                          : "z-10 w-64 md:w-80 opacity-30"

                    const transformStyle =
                      !isCarouselExpanded
                        ? relativePosition === 0
                          ? "translate(-50%, -50%) translateX(0%) translateY(-2%) scale(1) rotate(0deg)"
                          : relativePosition < 0
                            ? "translate(-50%, -50%) translateX(-8%) translateY(1%) scale(0.95) rotate(-2deg)"
                            : "translate(-50%, -50%) translateX(8%) translateY(1%) scale(0.95) rotate(2deg)"
                        : relativePosition === 0
                          ? "translate(-50%, -50%) translateX(0%) translateY(-2%) scale(1) rotate(0deg)"
                          : relativePosition === -1
                            ? "translate(-50%, -50%) translateX(-62%) translateY(5%) scale(0.86) rotate(-6deg)"
                            : relativePosition === 1
                              ? "translate(-50%, -50%) translateX(62%) translateY(5%) scale(0.86) rotate(6deg)"
                              : relativePosition === -2
                                ? "translate(-50%, -50%) translateX(-118%) translateY(10%) scale(0.72) rotate(-10deg)"
                                : "translate(-50%, -50%) translateX(118%) translateY(10%) scale(0.72) rotate(10deg)"

                    const commonClass = `absolute overflow-hidden rounded-2xl bg-white shadow-xl transition-[transform,opacity] duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] ${slotClass}`

                    if (isInteractive) {
                      return (
                        <button
                          key={`image-${imageIndex}`}
                          type="button"
                          aria-label={relativePosition === -1 ? "Previous image" : "Next image"}
                          onClick={() => setSelectedImageIndex(imageIndex)}
                          className={`${commonClass} cursor-pointer`}
                          style={{
                            left: "50%",
                            top: "50%",
                            transform: transformStyle,
                          }}
                        >
                          <img
                            src={withCacheBuster(url, selectedItem.id)}
                            alt={`${selectedItem.name} preview ${imageIndex + 1}`}
                            className="aspect-[4/3] w-full object-contain"
                            onError={() => markImageAsFailed(url)}
                          />
                        </button>
                      )
                    }

                    return (
                      <div
                        key={`image-${imageIndex}`}
                        className={`${commonClass} ${isCenter ? "" : "pointer-events-none"}`}
                        style={{
                          left: "50%",
                          top: "50%",
                          transform: transformStyle,
                        }}
                      >
                        <img
                          src={withCacheBuster(url, selectedItem.id)}
                          alt={`${selectedItem.name} preview ${imageIndex + 1}`}
                          className="aspect-[4/3] w-full object-contain"
                          onError={() => markImageAsFailed(url)}
                        />
                      </div>
                    )
                  })
                ) : (
                  <div className="flex aspect-[4/3] w-80 items-center justify-center rounded-2xl bg-white md:w-[540px]">
                    <p className="text-xs text-muted-foreground">No image yet</p>
                  </div>
                )}
              </div>

              {/* Dot indicators */}
              {total > 1 ? (
                <div className="mt-1 flex justify-center gap-1.5 pb-1">
                  {urls.map((_, index) => (
                    <button
                      key={`dot-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        selectedImageIndex === index
                          ? "w-4 bg-cyan-600"
                          : "w-1.5 bg-cyan-300"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              ) : null}

              {/* Model info */}
              <div className="space-y-1 px-6 py-5 text-center">
                <h2 className="text-2xl font-bold leading-tight md:text-3xl">{selectedItem.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-base text-muted-foreground">
                    {selectedItem.item_no || "No Item No"}
                    {selectedItem.scale ? ` • ${selectedItem.scale}` : ""}
                  </p>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={refreshImagePreview}
                    disabled={loading}
                    aria-label="Refresh current model images"
                    className="h-7 w-7"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Collection summary info */}
              <div className="grid grid-cols-3 gap-4 border-t px-6 pb-6 pt-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Buys</p>
                  <p className="text-base font-semibold">{selectedItem.purchaseCount ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(selectedItem.purchaseCount ?? 0) > 1 ? "Multiple purchases" : "Single purchase"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  <p className="text-base font-semibold">{selectedItem.totalOwnedQuantity ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-base font-semibold">RM {(selectedItem.totalSpent ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )
      })() : null}
    </div>
  )
}
