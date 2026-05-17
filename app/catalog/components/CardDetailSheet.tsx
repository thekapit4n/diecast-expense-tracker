"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, ShoppingBag, CalendarDays, Package } from "lucide-react"
import { cn } from "@/lib/utils"
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

/*
 * Sort purchases: highest price_per_unit first.
 * Null prices are pushed to the bottom.
 */
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

  useEffect(() => {
    setFailedUrls(new Set())
    setImageIndex(0)
  }, [item?.id])

  const availableUrls = item ? item.imageUrls.filter((url) => !failedUrls.has(url)) : []
  const currentUrl = availableUrls[imageIndex] ?? null
  const total = availableUrls.length

  function prev() { setImageIndex((i) => (i - 1 + total) % total) }
  function next() { setImageIndex((i) => (i + 1) % total) }

  const sortedPurchases = item ? sortByPriceDesc(item.purchases) : []
  const totalQty = item?.totalQty ?? 0

  return (
    <Drawer open={!!item} onClose={onClose}>
      <DrawerContent className="max-h-[92dvh] border-[#27272A] bg-[#16181D] text-[#F4F4F5] focus:outline-none">
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[#3F3F46]" />

        {item && (
          <div className="flex flex-col overflow-y-auto">

            {/* ---- Image carousel ---- */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0F1014]">
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
                  <svg className="h-16 w-16 text-[#3F3F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {total > 1 && (
                <>
                  <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {availableUrls.map((_, i) => (
                      <button key={i} type="button" onClick={() => setImageIndex(i)}
                        className={cn("h-1.5 rounded-full transition-all", i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/40")}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ---- Model info ---- */}
            <div className="px-5 pt-4">
              <DrawerHeader className="p-0">
                <DrawerTitle className="text-left text-lg font-bold leading-snug text-[#F4F4F5]">
                  {item.name}
                </DrawerTitle>
              </DrawerHeader>

              <div className="mt-2.5 flex flex-wrap gap-2">
                {item.item_no && (
                  <Badge variant="outline" className="border-[#3F3F46] bg-[#0B0B0C] text-[#A1A1AA]">
                    {item.item_no}
                  </Badge>
                )}
                <Badge variant="outline" className="border-[#3F3F46] bg-[#0B0B0C] text-[#A1A1AA]">
                  {item.brand_name}
                </Badge>
                {item.scale && (
                  <Badge variant="outline" className="border-[#3F3F46] bg-[#0B0B0C] text-[#A1A1AA]">
                    {item.scale}
                  </Badge>
                )}
                {item.isChase && (
                  <Badge className="bg-[#FF3B30] text-white hover:bg-[#FF3B30]">Chase</Badge>
                )}
                {item.isCase && (
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">Case</Badge>
                )}
              </div>
            </div>

            {/* ---- Purchase history ---- */}
            {sortedPurchases.length > 0 && (
              <div className="px-5 pb-8 pt-4">
                <Separator className="mb-4 bg-[#27272A]" />

                {/* Header row */}
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
                    Purchase History
                  </p>
                  <div className="flex items-center gap-1.5 rounded-full bg-[#3B82F6]/15 px-2.5 py-1">
                    <Package className="h-3 w-3 text-[#3B82F6]" />
                    <span className="text-[11px] font-bold text-[#3B82F6]">
                      {totalQty} {totalQty === 1 ? "unit" : "units"} owned
                    </span>
                  </div>
                </div>

                {/* Purchase rows */}
                <div className="flex flex-col gap-2">
                  {sortedPurchases.map((p, idx) => {
                    const date = formatDate(p.paymentDate)
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#27272A] bg-[#0B0B0C] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: shop + date */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <ShoppingBag className="h-3 w-3 shrink-0 text-[#A1A1AA]" />
                              <p className="truncate text-[12px] font-semibold text-[#F4F4F5]">
                                {p.shopName ?? "—"}
                              </p>
                            </div>
                            {p.platform && (
                              <p className="mt-0.5 pl-4.5 text-[10px] text-[#71717A]">
                                via {p.platform}
                              </p>
                            )}
                            {date && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3 shrink-0 text-[#71717A]" />
                                <p className="text-[10px] text-[#71717A]">{date}</p>
                              </div>
                            )}
                          </div>

                          {/* Right: price + qty */}
                          <div className="shrink-0 text-right">
                            {p.pricePerUnit != null ? (
                              <>
                                <p className="text-sm font-bold text-[#F4F4F5]">
                                  {formatPrice(p.pricePerUnit)}
                                </p>
                                <p className="text-[10px] text-[#71717A]">per unit</p>
                              </>
                            ) : (
                              <p className="text-sm text-[#52525B]">—</p>
                            )}
                            <div className="mt-1 inline-flex items-center rounded-full bg-[#27272A] px-2 py-0.5">
                              <span className="text-[10px] font-semibold text-[#A1A1AA]">
                                ×{p.quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Total price row */}
                        {p.totalPrice != null && p.quantity > 1 && (
                          <div className="mt-2 border-t border-[#27272A] pt-2 text-right">
                            <span className="text-[11px] text-[#71717A]">Total: </span>
                            <span className="text-[11px] font-semibold text-[#A1A1AA]">
                              {formatPrice(p.totalPrice)}
                            </span>
                          </div>
                        )}

                        {/* Chase indicator */}
                        {p.isChase && (
                          <div className="mt-2 border-t border-[#27272A] pt-2">
                            <span className="rounded-full bg-[#FF3B30]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF3B30]">
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
                <Separator className="mb-4 bg-[#27272A]" />
                <p className="text-center text-xs text-[#52525B]">No purchase records</p>
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
