"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
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

export default function MiniGtCollectionPage() {
  const supabase = createClient()
  const [items, setItems] = useState<MiniGtCollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedItem, setSelectedItem] = useState<MiniGtCollectionItem | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isCarouselExpanded, setIsCarouselExpanded] = useState(false)
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set())

  const extractImageUrls = (remark: string | null): string[] => {
    if (!remark) return []

    const matches = remark.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/gi)
    return matches ? matches.map((url) => url.trim()) : []
  }

  const getLocalSeriesImages = (itemNo: string | null): string[] => {
    if (!itemNo) return []

    const normalizedSeries = itemNo.trim().toUpperCase()
    const detectedSeries = normalizedSeries.match(/MGT\d+/)?.[0] || normalizedSeries
    return Array.from({ length: 12 }, (_, index) => `/api/mini-gt/image/${detectedSeries}/${index + 1}.jpg`)
  }

  useEffect(() => {
    const fetchMiniGtCollection = async () => {
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

        ;(purchaseData || []).forEach((purchase: any) => {
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

        const formatted = (collectionData || [])
          .map((item: any) => {
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
              brand_name: item.tbl_master_brand?.name || "",
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
    }

    fetchMiniGtCollection()
  }, [supabase])

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
          <div>
            <CardTitle>My Mini GT</CardTitle>
            <CardDescription>
              Search your owned Mini GT models and open matching catalog pages quickly.
            </CardDescription>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
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
                          <div className="aspect-[4/3] w-full overflow-hidden">
                            <img
                              src={availableItemImageUrls[0]}
                              alt={`${item.name} thumbnail`}
                              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                              onError={() => markImageAsFailed(availableItemImageUrls[0])}
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/30">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              No image yet
                            </p>
                          </div>
                        )}
                      </button>
                      <div className="space-y-1 p-3">
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.item_no || "No Item No"}{item.scale ? ` • ${item.scale}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedItem ? (() => {
        const urls = selectedItem.imageUrls.filter((url) => !failedImageUrls.has(url))
        const total = urls.length
        const seriesNum = selectedItem.item_no?.replace(/^[A-Z]+0*/i, "") || ""
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
                            src={url}
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
                          src={url}
                          alt={`${selectedItem.name} preview ${imageIndex + 1}`}
                          className="aspect-[4/3] w-full object-contain"
                          onError={() => markImageAsFailed(url)}
                        />
                        {isCenter ? (
                          <>
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-bold text-gray-700">
                              <span className="text-red-600">▶</span>
                              {seriesNum}
                            </div>
                            <div className="absolute bottom-2 right-2 text-right leading-tight">
                              <p className="text-[10px] font-bold tracking-tight text-gray-700">MINI GT</p>
                              <p className="text-[9px] text-gray-400">LHD version shown</p>
                            </div>
                          </>
                        ) : null}
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
                <p className="text-base text-muted-foreground">
                  {selectedItem.item_no || "No Item No"}
                  {selectedItem.scale ? ` • ${selectedItem.scale}` : ""}
                </p>
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
