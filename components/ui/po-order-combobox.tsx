"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"

export interface PoOrderOption {
  id: string
  reference: string | null
  channel: string | null
  eta: string | null
  po_close_date: string | null
  full_payment: boolean | null
  source_link: string | null
  shop_id: string | null
  shop_name?: string | null
}

interface PoOrderComboboxProps {
  value: string | null
  onValueChange: (order: PoOrderOption | null) => void
  inputValue: string
  onInputChange: (value: string) => void
  placeholder?: string
}

export function PoOrderCombobox({
  value,
  onValueChange,
  inputValue,
  onInputChange,
  placeholder = "Search or name a new PO order...",
}: PoOrderComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [orders, setOrders] = React.useState<PoOrderOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const supabase = createClient()

  React.useEffect(() => {
    if (!open) return

    const fetchOrders = async () => {
      setLoading(true)
      try {
        let q = supabase
          .from("tbl_po_order")
          .select(
            "id, reference, channel, eta, po_close_date, full_payment, source_link, shop_id, tbl_shop_information(shop_name)"
          )
          .order("created_at", { ascending: false })

        if (inputValue.trim().length >= 2) {
          q = q.ilike("reference", `%${inputValue.trim()}%`)
        }

        const { data, error } = await q.limit(30)
        if (error) throw error

        const formatted: PoOrderOption[] = (data || []).map((row: any) => ({
          id: row.id,
          reference: row.reference,
          channel: row.channel,
          eta: row.eta,
          po_close_date: row.po_close_date,
          full_payment: row.full_payment,
          source_link: row.source_link,
          shop_id: row.shop_id,
          shop_name: row.tbl_shop_information?.shop_name ?? null,
        }))
        setOrders(formatted)
      } catch (e) {
        console.error("Failed to fetch PO orders:", e)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchOrders, 250)
    return () => clearTimeout(timeoutId)
  }, [open, inputValue, supabase])

  const selected = orders.find((o) => o.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            selected && "border-primary bg-primary/5"
          )}
        >
          {selected ? (
            <span className="truncate flex items-center gap-2">
              <span className="text-primary">✓</span>
              {selected.reference || "Untitled order"}
              {selected.shop_name && (
                <span className="text-muted-foreground">· {selected.shop_name}</span>
              )}
            </span>
          ) : inputValue ? (
            <span className="truncate flex items-center gap-2">
              <span className="text-orange-500">+</span>
              {inputValue}
              <span className="text-xs text-muted-foreground">(new order)</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search PO reference..."
            value={inputValue}
            onValueChange={onInputChange}
          />
          <CommandList>
            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : orders.length === 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  {inputValue.trim().length < 2 ? (
                    <p className="text-muted-foreground">Type at least 2 characters to search...</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">No existing PO order found</p>
                      <div className="mx-auto mt-2 max-w-xs rounded-md bg-primary/10 px-3 py-2 text-xs">
                        <p className="font-medium text-primary">Will create as new order:</p>
                        <p className="mt-1 font-semibold text-foreground">&quot;{inputValue}&quot;</p>
                      </div>
                    </>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <>
                <CommandGroup heading="Existing PO orders (click to reuse)">
                  {orders.map((order) => (
                    <CommandItem
                      key={order.id}
                      value={order.id}
                      onSelect={() => {
                        onValueChange(order)
                        onInputChange(order.reference || "")
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === order.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{order.reference || "Untitled order"}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.shop_name}
                          {order.eta && ` · ETA ${order.eta}`}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>

                {inputValue.trim().length >= 2 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Or create new">
                      <CommandItem
                        value="__create_new_order__"
                        onSelect={() => {
                          onValueChange(null)
                          setOpen(false)
                        }}
                        className="bg-muted/50"
                      >
                        <Plus className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">
                          Create new PO order &quot;{inputValue}&quot;
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
