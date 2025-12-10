"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Brand {
  id: number
  name: string
  type: string
}

interface BrandComboboxProps {
  brands: Brand[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function BrandCombobox({
  brands,
  value,
  onValueChange,
  placeholder = "Select brand...",
}: BrandComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedBrand = brands.find(
    (brand) => brand.id.toString() === value
  )

  // Group brands by type
  const groupedBrands = React.useMemo(() => {
    const groups: Record<string, Brand[]> = {}
    brands.forEach((brand) => {
      if (!groups[brand.type]) {
        groups[brand.type] = []
      }
      groups[brand.type].push(brand)
    })
    return groups
  }, [brands])

  // Sort types: Diecast first, then alphabetically
  const sortedTypes = React.useMemo(() => {
    return Object.keys(groupedBrands).sort((a, b) => {
      if (a === "Diecast") return -1
      if (b === "Diecast") return 1
      return a.localeCompare(b)
    })
  }, [groupedBrands])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedBrand ? (
            <span className="truncate">
              {selectedBrand.name} <span className="text-muted-foreground">({selectedBrand.type})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search brand..." />
          <CommandList>
            <CommandEmpty>No brand found.</CommandEmpty>
            {sortedTypes.map((type) => (
              <CommandGroup key={type} heading={type}>
                {groupedBrands[type].map((brand) => (
                  <CommandItem
                    key={brand.id}
                    value={`${brand.name} ${brand.type}`}
                    onSelect={() => {
                      onValueChange(brand.id.toString())
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === brand.id.toString()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="flex-1">{brand.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

