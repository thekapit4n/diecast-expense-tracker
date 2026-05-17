"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
import type { CatalogBrand } from "../page"

interface BrandTabsProps {
  brands: CatalogBrand[]
  selectedBrands: string[]
  onChange: (brands: string[]) => void
}

export default function BrandTabs({ brands, selectedBrands, onChange }: BrandTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAllActive = selectedBrands.length === 0

  function handleAllClick() {
    onChange([])
  }

  function handleBrandClick(brandName: string) {
    if (selectedBrands.includes(brandName)) {
      onChange(selectedBrands.filter((name) => name !== brandName))
      return
    }
    onChange([...selectedBrands, brandName])
  }

  return (
    <div
      ref={scrollRef}
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        onClick={handleAllClick}
        className={cn(
          "snap-start whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150",
          isAllActive ? tw.pillActive : tw.pillInactive
        )}
      >
        All
      </button>

      {brands.map((brand) => {
        const isActive = selectedBrands.includes(brand.name)
        return (
          <button
            key={brand.id}
            type="button"
            onClick={() => handleBrandClick(brand.name)}
            className={cn(
              "snap-start whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150",
              isActive ? tw.pillActive : tw.pillInactive
            )}
          >
            {brand.name}
          </button>
        )
      })}
    </div>
  )
}
