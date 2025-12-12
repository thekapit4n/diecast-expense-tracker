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

export interface CollectionOption {
  id: string
  name: string
  item_no: string | null
  brand_id: number
  brand_name: string
  scale: string | null
}

interface ItemNoComboboxProps {
  collections: CollectionOption[]
  value: string | null
  onValueChange: (collection: CollectionOption | null) => void
  placeholder?: string
  inputValue: string
  onInputChange: (value: string) => void
}

export function ItemNoCombobox({
  collections,
  value,
  onValueChange,
  placeholder = "Search by item number...",
  inputValue,
  onInputChange,
}: ItemNoComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCollection = collections.find(
    (collection) => collection.id === value
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            selectedCollection && "border-primary bg-primary/5"
          )}
        >
          {inputValue || (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type item number..." 
            value={inputValue}
            onValueChange={onInputChange}
          />
          <CommandList>
            {collections.length === 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  {inputValue.length < 2 ? (
                    <p className="text-muted-foreground">Type at least 2 characters to search...</p>
                  ) : (
                    <p className="text-muted-foreground">No collections found</p>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Matching Collections">
                {collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={collection.id}
                    onSelect={() => {
                      onValueChange(collection)
                      onInputChange(collection.item_no || "")
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === collection.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {collection.item_no}
                        </span>
                        <span className="font-medium">{collection.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {collection.brand_name}
                        {collection.scale && ` • ${collection.scale}`}
                      </div>
                    </div>
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
