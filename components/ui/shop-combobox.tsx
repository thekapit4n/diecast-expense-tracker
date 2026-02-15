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
import { createClient } from "@/lib/supabase/client"

export interface ShopOption {
  id: string
  shop_name: string | null
  address: string | null
  country: string | null
}

interface ShopComboboxProps {
  /** Current shop name for trigger display */
  value?: string
  /** Called when user selects a shop; parent should set shopName, address, country */
  onSelect: (shop: ShopOption | null) => void
  placeholder?: string
  /** Optional: control open state from parent */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional: className for trigger button */
  className?: string
}

export function ShopCombobox({
  value,
  onSelect,
  placeholder = "Search or select shop...",
  open: controlledOpen,
  onOpenChange,
  className,
}: ShopComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [shops, setShops] = React.useState<ShopOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const supabase = createClient()

  const fetchShops = React.useCallback(
    async (query: string) => {
      setLoading(true)
      try {
        let q = supabase
          .from("tbl_shop_information")
          .select("id, shop_name, address, country")
          .order("shop_name", { ascending: true })
        if (query.trim()) {
          q = q.ilike("shop_name", `%${query.trim()}%`)
        }
        const { data, error } = await q.limit(50)
        if (error) throw error
        setShops((data as ShopOption[]) ?? [])
      } catch (e) {
        console.error("Failed to fetch shops:", e)
        setShops([])
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  React.useEffect(() => {
    if (open) {
      fetchShops(search)
    }
  }, [open, search, fetchShops])

  const displayLabel = (shop: ShopOption) => {
    const name = shop.shop_name?.trim() || "(No name)"
    const parts = [shop.address?.trim(), shop.country?.trim()].filter(Boolean)
    return parts.length ? `${name} – ${parts.join(", ")}` : name
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {value?.trim() ? (
              value
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search shop name..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : shops.length === 0 ? (
              <CommandEmpty>No shop found. You can enter details below and save.</CommandEmpty>
            ) : (
              <CommandGroup heading="Select a shop">
                {shops.map((shop) => (
                  <CommandItem
                    key={shop.id}
                    value={shop.id}
                    onSelect={() => {
                      onSelect(shop)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.trim() === (shop.shop_name ?? "").trim()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate">{displayLabel(shop)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
