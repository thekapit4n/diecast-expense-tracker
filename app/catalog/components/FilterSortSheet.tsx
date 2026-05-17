"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
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

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
        active ? tw.pillActive : tw.pillInactive
      )}
    >
      {children}
    </button>
  )
}

export default function FilterSortSheet({
  open,
  onClose,
  brands,
  scales,
  filters,
  onChange,
}: FilterSortSheetProps) {
  const [draft, setDraft] = useState<FilterState>(filters)

  function selectAllBrands() {
    setDraft((prev) => ({ ...prev, brands: [] }))
  }

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

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) setDraft(filters)
    else onClose()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className={cn("max-h-[85dvh] overflow-y-auto rounded-t-2xl px-0 pb-8", tw.sheet)}>
        <SheetHeader className="px-5 pb-2 pt-4">
          <SheetTitle className="text-left text-base font-bold text-foreground">
            Filter &amp; Sort
          </SheetTitle>
        </SheetHeader>

        <Separator className="bg-border" />

        <div className="px-5 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <PillButton
                key={opt.value}
                active={draft.sort === opt.value}
                onClick={() => setDraft((prev) => ({ ...prev, sort: opt.value }))}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {brands.length > 0 && (
          <div className="px-5 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Brand</p>
            <div className="flex flex-wrap gap-2">
              <PillButton active={draft.brands.length === 0} onClick={selectAllBrands}>
                All
              </PillButton>
              {brands.map((brand) => (
                <PillButton
                  key={brand.id}
                  active={draft.brands.includes(brand.name)}
                  onClick={() => toggleBrand(brand.name)}
                >
                  {brand.name}
                </PillButton>
              ))}
            </div>
          </div>
        )}

        {scales.length > 0 && (
          <div className="px-5 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Scale</p>
            <div className="flex flex-wrap gap-2">
              {scales.map((scale) => (
                <PillButton
                  key={scale}
                  active={draft.scales.includes(scale)}
                  onClick={() => toggleScale(scale)}
                >
                  {scale}
                </PillButton>
              ))}
            </div>
          </div>
        )}

        <Separator className="mx-5 mt-6 bg-border" />

        <div className="flex gap-3 px-5 pt-4">
          <Button
            variant="outline"
            className="flex-1 border-border bg-transparent text-muted-foreground hover:bg-border hover:text-foreground"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button className={cn("flex-1 font-semibold text-white", tw.accentBg, tw.accentBgHover)} onClick={handleApply}>
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}