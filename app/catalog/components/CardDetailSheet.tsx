"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, ShoppingBag, CalendarDays, Package, Copy } from "lucide-react"
import { toast } from "sonner"
import { appendImageCacheVersion, stripImageCacheVersion } from "@/lib/collection-images"
import { cn } from "@/lib/utils"
import { colors, tw } from "@/lib/theme/diecast-theme"
import { isPreOrderPurchase } from "@/lib/catalog-ownership"
import type { CatalogItem, PurchaseRecord } from "@/lib/catalog-types"

interface CardDetailSheetProps {
  item: CatalogItem | null
  onClose: () => void
  onReload?: () => void
  isReloading?: boolean
  imageReloadBust?: number | null
}

function formatPrice(value: number): string {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null
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

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${label}`)
  } catch {
    toast.error("Failed to copy")
  }
}

function sortByPriceDesc(purchases: PurchaseRecord[]): PurchaseRecord[] {
  return [...purchases].sort((a, b) => {
    if (a.pricePerUnit == null && b.pricePerUnit == null) return 0
    if (a.pricePerUnit == null) return 1
    if (b.pricePerUnit == null) return -1
    return b.pricePerUnit - a.pricePerUnit
  })
}

export default function CardDetailSheet({
  item,
  onClose,
  onReload,
  isReloading = false,
  imageReloadBust = null,
}: CardDetailSheetProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [imageIndex, setImageIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setFailedUrls(new Set())
    setImageIndex(0)
  }, [item?.id, imageReloadBust])

  const displayUrls = item
    ? item.imageUrls.map((url) => {
        if (!imageReloadBust) return url
        return appendImageCacheVersion(stripImageCacheVersion(url), imageReloadBust)
      })
    : []

  const availableUrls = displayUrls.filter(
    (url) => !failedUrls.has(stripImageCacheVersion(url))
  )
  const currentUrl = availableUrls[imageIndex] ?? null
  const total = availableUrls.length

  function prev() { setImageIndex((i) => (i - 1 + total) % total) }
  function next() { setImageIndex((i) => (i + 1) % total) }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || total <= 1) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev()
    }
    touchStartX.current = null
  }

  const sortedPurchases = item ? sortByPriceDesc(item.purchases) : []
  const totalQty = item?.totalQty ?? 0
  const preOrderQty = item?.preOrderQty ?? 0

  return (
    <Drawer open={!!item} onClose={onClose}>
      <DrawerContent className={cn("border-t-2 focus:outline-none", tw.sheet)} style={{ borderColor: colors.accent.default }}>
        <div className="mx-auto mt-2 h-1 w-12 rounded-full" style={{ backgroundColor: colors.accent.handle }} />

        {item && (
          /*
           * Two-section layout:
           * 1. Image area — fixed height, never grows
           * 2. Scrollable details area — grows independently
           */
          <div className="flex max-h-[88dvh] flex-col overflow-hidden">

            {/* ---- Fixed image carousel ---- */}
            <div
              className="relative h-72 w-full shrink-0 overflow-hidden sm:h-80"
              style={{
                background: `radial-gradient(ellipse at center, ${colors.surface.imageGradientFrom} 0%, ${colors.surface.imageGradientTo} 100%)`,
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentUrl ? (
                <Image
                  key={currentUrl}
                  src={currentUrl}
                  alt={item.name}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  onError={() => {
                    const cacheKey = stripImageCacheVersion(currentUrl)
                    setFailedUrls((prev) => new Set(prev).add(cacheKey))
                    if (imageIndex >= availableUrls.length - 1) setImageIndex(0)
                  }}
                  unoptimized
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-16 w-16 text-[#2a4555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Arrows */}
              {total > 1 && (
                <>
                  <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {total > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {availableUrls.map((_, i) => (
                    <button key={i} type="button" onClick={() => setImageIndex(i)}
                      className={cn("h-1.5 rounded-full transition-all", i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/40")}
                    />
                  ))}
                </div>
              )}

              {/* Image counter pill */}
              {total > 1 && (
                <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                  {imageIndex + 1} / {total}
                </div>
              )}

              {onReload && (
                <button
                  type="button"
                  onClick={() => {
                    setFailedUrls(new Set())
                    setImageIndex(0)
                    onReload()
                  }}
                  disabled={isReloading}
                  className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-50"
                  aria-label="Reload images"
                  title="Reload catalog"
                >
                  {isReloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Bottom fade into content */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0e1c28] to-transparent" />
            </div>

            {/* ---- Scrollable details ---- */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4">
                <DrawerHeader className="p-0">
                  <DrawerTitle asChild>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.name, "title")}
                      className={cn(
                        "group flex items-start gap-1.5 text-left text-lg font-bold leading-snug",
                        tw.textTitle
                      )}
                      title="Copy title"
                    >
                      <span>{item.name}</span>
                      <Copy className="mt-1 h-3.5 w-3.5 shrink-0 text-[#4B6B88] opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </DrawerTitle>
                </DrawerHeader>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {item.item_no && (
                    <button type="button" onClick={() => copyToClipboard(item.item_no!, "item number")} title="Copy item number">
                      <Badge
                        variant="outline"
                        className={cn(tw.badgeTeal, "cursor-pointer gap-1")}
                      >
                        {item.item_no}
                        <Copy className="h-2.5 w-2.5" />
                      </Badge>
                    </button>
                  )}
                  <Badge
                    variant="outline"
                    className="border-[rgba(45,212,191,0.18)] bg-[rgba(45,212,191,0.08)] text-[#99F6E4]"
                  >
                    {item.brand_name}
                  </Badge>
                  {item.scale && (
                    <Badge
                      variant="outline"
                      className={tw.badgeTeal}
                    >
                      {item.scale}
                    </Badge>
                  )}
                  {item.isChase && (
                    <Badge className="bg-destructive text-white hover:bg-destructive">Chase</Badge>
                  )}
                  {item.isCase && (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">Case</Badge>
                  )}
                </div>
              </div>

              {/* Purchase history */}
              {sortedPurchases.length > 0 && (
                <div className="px-5 pb-8 pt-4">
                  <Separator className="mb-4" style={{ backgroundColor: colors.accent.separator }} />

                  <div className="mb-3 flex items-center justify-between">
                    <p
                      className={cn("text-xs uppercase", tw.textSection)}
                      style={{ letterSpacing: "0.12em", fontWeight: 600 }}
                    >
                      Purchase History
                    </p>
                    <div className="flex items-center gap-2">
                      {totalQty > 0 && (
                        <div
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                          style={{ backgroundColor: colors.owned.faint }}
                        >
                          <Package className="h-3 w-3" style={{ color: colors.owned.default }} />
                          <span className="text-[11px] font-bold" style={{ color: colors.owned.default }}>
                            {totalQty} {totalQty === 1 ? "unit" : "units"} owned
                          </span>
                        </div>
                      )}
                      {preOrderQty > 0 && (
                        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1">
                          <Package className="h-3 w-3 text-amber-400" />
                          <span className="text-[11px] font-bold text-amber-400">
                            {preOrderQty} on pre-order
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {sortedPurchases.map((p, idx) => {
                      const date = formatDate(p.paymentDate)
                      const isPreOrder = isPreOrderPurchase(p)
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-xl border p-3",
                            p.isChase
                              ? "border-destructive/30 bg-destructive/[0.04]"
                              : isPreOrder
                              ? "border-amber-500/30 bg-amber-500/[0.04]"
                              : "border-border bg-background"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <ShoppingBag className="h-3 w-3 shrink-0 text-[#64748B]" />
                                <p className="truncate text-[12px] font-semibold text-[#E2E8F0]">
                                  {p.shopName ?? "—"}
                                </p>
                                {p.isChase && (
                                  <span className="shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                    Chase
                                  </span>
                                )}
                                {isPreOrder && (
                                  <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0b1822]">
                                    Pre-order
                                  </span>
                                )}
                              </div>
                              {p.platform && (
                                <p className="mt-0.5 pl-[18px] text-[10px] text-[#64748B]">
                                  via {p.platform}
                                </p>
                              )}
                              {date && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <CalendarDays className="h-3 w-3 shrink-0 text-[#64748B]" />
                                  <p className="text-[10px] text-[#64748B]">{date}</p>
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 text-right">
                              {p.pricePerUnit != null ? (
                                <>
                                  <p
                                    className={cn(
                                      "text-sm font-bold",
                                      p.isChase ? "text-destructive" : "text-[#F1F5F9]"
                                    )}
                                  >
                                    {formatPrice(p.pricePerUnit)}
                                  </p>
                                  <p className="text-[10px] text-[#64748B]">per unit</p>
                                </>
                              ) : (
                                <p className="text-sm text-[#52525B]">—</p>
                              )}
                              <div className="mt-1 inline-flex items-center rounded-full bg-border px-2 py-0.5">
                                <span className="text-[10px] font-semibold text-[#A1A1AA]">×{p.quantity}</span>
                              </div>
                            </div>
                          </div>

                          {p.totalPrice != null && p.quantity > 1 && (
                            <div className="mt-2 border-t border-border pt-2 text-right">
                              <span className="text-[11px] text-[#71717A]">Total: </span>
                              <span className="text-[11px] font-semibold text-[#A1A1AA]">{formatPrice(p.totalPrice)}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {sortedPurchases.length === 0 && (
                <div className="px-5 pb-8 pt-2">
                  <Separator className="mb-4 bg-border" />
                  <p className="text-center text-xs text-[#52525B]">No purchase records</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
