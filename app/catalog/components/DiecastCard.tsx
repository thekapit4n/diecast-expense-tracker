"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { CatalogItem } from "../page"

interface DiecastCardProps {
  item: CatalogItem
  onClick: (item: CatalogItem) => void
}

export default function DiecastCard({ item, onClick }: DiecastCardProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const availableUrls = item.imageUrls.filter((url) => !failedUrls.has(url))
  const firstImage = availableUrls[0] ?? null

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#27272A] bg-[#16181D]",
        "transition-all duration-200 active:scale-[0.97]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#0F1014]">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setFailedUrls((prev) => new Set(prev).add(firstImage))}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-10 w-10 text-[#3F3F46]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Owned chip — top left */}
        {item.totalQty > 0 && (
          <div className="absolute left-2 top-2">
            <span className="rounded-full bg-[#3B82F6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
              Owned
            </span>
          </div>
        )}

        {/* Scale overlay — bottom right */}
        {item.scale && (
          <div className="absolute bottom-2 right-2">
            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              {item.scale}
            </span>
          </div>
        )}

        {/* Chase / Case — bottom left */}
        {(item.isChase || item.isCase) && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {item.isChase && (
              <span className="rounded bg-[#FF3B30]/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                Chase
              </span>
            )}
            {item.isCase && (
              <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                Case
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-col gap-0.5 px-2.5 py-2">
        <p className="line-clamp-2 text-left text-[11px] font-semibold leading-snug text-[#F4F4F5]">
          {item.name}
        </p>
        {item.item_no && (
          <p className="text-left text-[10px] text-[#71717A]">{item.item_no}</p>
        )}
        <p className="text-left text-[10px] text-[#A1A1AA]">{item.brand_name}</p>
      </div>
    </button>
  )
}
