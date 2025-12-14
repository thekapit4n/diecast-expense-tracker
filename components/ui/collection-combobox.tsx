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

export interface CollectionOption {
  id: string
  name: string
  item_no: string | null
  brand_id: number
  brand_name: string
  scale: string | null
}

interface CollectionComboboxProps {
  collections: CollectionOption[]
  value: string | null
  onValueChange: (collection: CollectionOption | null) => void
  placeholder?: string
  inputValue: string
  onInputChange: (value: string) => void
}

export function CollectionCombobox({
  collections,
  value,
  onValueChange,
  placeholder = "Search or type new collection name...",
  inputValue,
  onInputChange,
}: CollectionComboboxProps) {
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
          {selectedCollection ? (
            <span className="truncate flex items-center gap-2">
              <span className="text-primary">✓</span>
              {selectedCollection.name}
              {selectedCollection.item_no && (
                <span className="text-muted-foreground"> ({selectedCollection.item_no})</span>
              )}
            </span>
          ) : inputValue ? (
            <span className="truncate flex items-center gap-2">
              <span className="text-orange-500">+</span>
              {inputValue}
              <span className="text-xs text-muted-foreground">(new)</span>
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
            placeholder="Search collection name..." 
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
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No existing collection found</p>
                      <div className="mx-auto max-w-xs rounded-md bg-primary/10 px-3 py-2 text-xs">
                        <p className="font-medium text-primary">
                          Close this to add as new collection:
                        </p>
                        <p className="mt-1 font-semibold text-foreground">"{inputValue}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <>
                <CommandGroup heading="Existing Collections (Click to reuse)">
                  {collections.map((collection) => (
                    <CommandItem
                      key={collection.id}
                      value={collection.id}
                      onSelect={() => {
                        onValueChange(collection)
                        onInputChange(collection.name)
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
                          <span className="font-medium">{collection.name}</span>
                          {collection.item_no && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {collection.item_no}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {collection.brand_name}
                          {collection.scale && ` • ${collection.scale}`}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                
                {inputValue && inputValue.length >= 2 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Or Create New">
                      <CommandItem
                        value="__create_new__"
                        onSelect={() => {
                          onValueChange(null)
                          setOpen(false)
                        }}
                        className="bg-muted/50"
                      >
                        <Plus className="mr-2 h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary">
                              Create new collection
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            "{inputValue}" with different brand/scale/item no
                          </div>
                        </div>
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

