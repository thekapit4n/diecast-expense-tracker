"use client"

import { forwardRef } from "react"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import BrandPicker from "./BrandPicker"
import { SORT_OPTIONS, STATUS_OPTIONS, type FilterState, type SortOption, type StatusOption } from "./FilterSortSheet"
import type { CatalogBrand } from "@/lib/catalog-types"

interface DesktopFilterBarProps {
  brands: CatalogBrand[]
  scales: string[]
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const TriggerButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { active: boolean }
>(({ active, children, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-[var(--border-strong)]",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  )
})
TriggerButton.displayName = "TriggerButton"

export default function DesktopFilterBar({ brands, scales, filters, onChange }: DesktopFilterBarProps) {
  const typeActive = filters.status !== "all" || filters.chaseOnly
  const scaleActive = filters.scales.length > 0
  const sortActive = filters.sort !== "name_asc"
  const anyActive = filters.brands.length > 0 || typeActive || scaleActive || sortActive

  function toggleScale(scale: string) {
    const next = filters.scales.includes(scale)
      ? filters.scales.filter((s) => s !== scale)
      : [...filters.scales, scale]
    onChange({ ...filters, scales: next })
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? "Sort"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Brand — searchable multi-select */}
      <BrandPicker
        brands={brands}
        selected={filters.brands}
        onChange={(next) => onChange({ ...filters, brands: next })}
      />

      {/* Type — status + chase */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TriggerButton active={typeActive}>Type</TriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.status}
            onValueChange={(value) => onChange({ ...filters, status: value as StatusOption })}
          >
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={filters.chaseOnly}
            onCheckedChange={(checked) => onChange({ ...filters, chaseOnly: checked === true })}
            onSelect={(e) => e.preventDefault()}
          >
            Chase only
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Scale */}
      {scales.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TriggerButton active={scaleActive}>
              {scaleActive ? `Scale (${filters.scales.length})` : "Scale"}
            </TriggerButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {scales.map((scale) => (
              <DropdownMenuCheckboxItem
                key={scale}
                checked={filters.scales.includes(scale)}
                onCheckedChange={() => toggleScale(scale)}
                onSelect={(e) => e.preventDefault()}
              >
                {scale}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TriggerButton active={sortActive}>{sortLabel}</TriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuRadioGroup
            value={filters.sort}
            onValueChange={(value) => onChange({ ...filters, sort: value as SortOption })}
          >
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {anyActive && (
        <button
          type="button"
          onClick={() => onChange({ brands: [], scales: [], status: "all", chaseOnly: false, sort: "name_asc" })}
          className={cn("flex items-center gap-1 px-1 text-xs font-medium hover:underline", tw.accent)}
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}
    </div>
  )
}
