"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, ShoppingBag, CalendarDays, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { colors, tw } from "@/lib/theme/diecast-theme"
import type { CatalogItem, PurchaseRecord } from "../page"

interface CardDetailSheetProps {
  item: CatalogItem | null
  onClose: () => void
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

function sortByPriceDesc(purchases: PurchaseRecord[]): PurchaseRecord[] {
  return [...purchases].sort((a, b) => {
    if (a.pricePerUnit == null && b.pricePerUnit == null) return 0
    if (a.pricePerUnit == null) return 1
    if (b.pricePerUnit == null) return -1
    return b.pricePerUnit - a.pricePerUnit
  })
}

export default function CardDetailSheet({ item, onClose }: CardDetailSheetProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [imageIndex, setImageIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setFailedUrls(new Set())
    setImageIndex(0)
  }, [item?.id])

  const availableUrls = item ? item.imageUrls.filter((url) => !failedUrls.has(url)) : []
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
                    setFailedUrls((prev) => new Set(prev).add(currentUrl))
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

              {/* Bottom fade into content */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0e1c28] to-transparent" />
            </div>

            {/* ---- Scrollable details ---- */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4">
                <DrawerHeader className="p-0">
                  <DrawerTitle className={cn("text-left text-lg font-bold leading-snug", tw.textTitle)}>
                    {item.name}
                  </DrawerTitle>
                </DrawerHeader>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {item.item_no && (
                    <Badge
                      variant="outline"
                      className={tw.badgeTeal}
                    >
                      {item.item_no}
                    </Badge>
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
                    <div
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                      style={{ backgroundColor: colors.owned.faint }}
                    >
                      <Package className="h-3 w-3" style={{ color: colors.owned.default }} />
                      <span className="text-[11px] font-bold" style={{ color: colors.owned.default }}>
                        {totalQty} {totalQty === 1 ? "unit" : "units"} owned
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {sortedPurchases.map((p, idx) => {
                      const date = formatDate(p.paymentDate)
                      return (
                        <div key={idx} className="rounded-xl border border-border bg-background p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <ShoppingBag className="h-3 w-3 shrink-0 text-[#64748B]" />
                                <p className="truncate text-[12px] font-semibold text-[#E2E8F0]">
                                  {p.shopName ?? "—"}
                                </p>
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
                                  <p className="text-sm font-bold text-[#F1F5F9]">
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

                          {p.isChase && (
                            <div className="mt-2 border-t border-border pt-2">
                              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                                Chase Unit
                              </span>
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
