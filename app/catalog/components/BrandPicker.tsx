"use client"

import { useMemo } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { CatalogBrand } from "@/lib/catalog-types"

interface BrandPickerProps {
  brands: CatalogBrand[]
  selected: string[]
  onChange: (next: string[]) => void
  /** "chip" = bordered rectangle (desktop toolbar), "pill" = rounded pill (mobile sheet) */
  variant?: "chip" | "pill"
}

export default function BrandPicker({ brands, selected, onChange, variant = "chip" }: BrandPickerProps) {
  const active = selected.length > 0

  // Pin selected brands to the top so the user doesn't have to scroll to find
  // what's already checked, matching the mobile app's picker behavior.
  const orderedBrands = useMemo(() => {
    if (selected.length === 0) return brands
    const selectedSet = new Set(selected)
    const selectedBrands = brands.filter((b) => selectedSet.has(b.name))
    const unselectedBrands = brands.filter((b) => !selectedSet.has(b.name))
    return [...selectedBrands, ...unselectedBrands]
  }, [brands, selected])

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((b) => b !== name) : [...selected, name])
  }

  const label = selected.length === 0 ? "Brand" : selected.length === 1 ? selected[0] : `Brand (${selected.length})`

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold transition-colors",
          variant === "chip"
            ? cn(
                "rounded-lg border px-3 py-1.5",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-[var(--border-strong)]"
              )
            : cn("rounded-full px-4 py-1.5", active ? tw.pillActive : tw.pillInactive)
        )}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search brand..." />
          <CommandList>
            <CommandEmpty>No brand found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => onChange([])}>
                <Check className={cn("h-4 w-4", selected.length === 0 ? "opacity-100" : "opacity-0")} />
                All brands
              </CommandItem>
              {orderedBrands.map((brand) => {
                const isActive = selected.includes(brand.name)
                return (
                  <CommandItem key={brand.id} value={brand.name} onSelect={() => toggle(brand.name)}>
                    <Check className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-0")} />
                    {brand.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
