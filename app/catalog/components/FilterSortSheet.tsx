"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { CatalogBrand } from "../page"

export type SortOption = "name_asc" | "name_desc" | "series_asc"

export interface FilterState {
  brands: string[]
  scales: string[]
  sort: SortOption
}

interface FilterSortSheetProps {
  open: boolean
  onClose: () => void
  brands: CatalogBrand[]
  scales: string[]
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "series_asc", label: "Series No." },
]

export default function FilterSortSheet({
  open,
  onClose,
  brands,
  scales,
  filters,
  onChange,
}: FilterSortSheetProps) {
  /* Local draft so changes only apply when user taps Apply */
  const [draft, setDraft] = useState<FilterState>(filters)

  function toggleBrand(name: string) {
    setDraft((prev) => ({
      ...prev,
      brands: prev.brands.includes(name)
        ? prev.brands.filter((b) => b !== name)
        : [...prev.brands, name],
    }))
  }

  function toggleScale(scale: string) {
    setDraft((prev) => ({
      ...prev,
      scales: prev.scales.includes(scale)
        ? prev.scales.filter((s) => s !== scale)
        : [...prev.scales, scale],
    }))
  }

  function handleReset() {
    const reset: FilterState = { brands: [], scales: [], sort: "name_asc" }
    setDraft(reset)
    onChange(reset)
    onClose()
  }

  function handleApply() {
    onChange(draft)
    onClose()
  }

  /* Sync draft when sheet opens */
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) setDraft(filters)
    else onClose()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-[#1d3344] bg-[#0e1c28] px-0 pb-8 text-[#F4F4F5]"
      >
        <SheetHeader className="px-5 pb-2 pt-4">
          <SheetTitle className="text-left text-base font-bold text-[#F4F4F5]">
            Filter &amp; Sort
          </SheetTitle>
        </SheetHeader>

        <Separator className="bg-[#1d3344]" />

        {/* Sort */}
        <div className="px-5 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Sort</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, sort: opt.value }))}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                  draft.sort === opt.value
                    ? "bg-[#3c647b] text-white"
                    : "border border-[#1d3344] bg-transparent text-[#A1A1AA] hover:border-[#3c647b]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand filter */}
        {brands.length > 0 && (
          <div className="px-5 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Brand</p>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => toggleBrand(brand.name)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                    draft.brands.includes(brand.name)
                      ? "bg-[#3c647b] text-white"
                      : "border border-[#1d3344] bg-transparent text-[#A1A1AA] hover:border-[#3c647b]"
                  )}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scale filter */}
        {scales.length > 0 && (
          <div className="px-5 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Scale</p>
            <div className="flex flex-wrap gap-2">
              {scales.map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => toggleScale(scale)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                    draft.scales.includes(scale)
                      ? "bg-[#3c647b] text-white"
                      : "border border-[#1d3344] bg-transparent text-[#A1A1AA] hover:border-[#3c647b]"
                  )}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
        )}

        <Separator className="mx-5 mt-6 bg-[#1d3344]" />

        {/* Actions */}
        <div className="flex gap-3 px-5 pt-4">
          <Button
            variant="outline"
            className="flex-1 border-[#1d3344] bg-transparent text-[#A1A1AA] hover:bg-[#1d3344] hover:text-[#F4F4F5]"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            className="flex-1 bg-[#3c647b] text-white hover:bg-[#4e7a93] font-semibold"
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
