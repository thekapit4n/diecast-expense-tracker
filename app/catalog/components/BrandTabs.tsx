"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"
import type { CatalogBrand } from "../page"

interface BrandTabsProps {
  brands: CatalogBrand[]
  selected: string | null
  onChange: (brandName: string | null) => void
}

export default function BrandTabs({ brands, selected, onChange }: BrandTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const tabs = [{ id: null, label: "All" }, ...brands.map((b) => ({ id: b.name, label: b.name }))]

  return (
    <div
      ref={scrollRef}
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = selected === tab.id
        return (
          <button
            key={tab.id ?? "all"}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "snap-start whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150",
              isActive
                ? "bg-[#3c647b] text-white shadow-[0_0_12px_rgba(60,100,123,0.55)]"
                : "border border-[#1d3344] bg-[#122030] text-[#A1A1AA] hover:border-[#3c647b] hover:text-[#F4F4F5]"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
