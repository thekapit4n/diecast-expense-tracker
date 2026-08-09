"use client"

import * as React from "react"
import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface CollectionOption {
  id: string
  name: string
  item_no: string | null
  brand_id: number
  brand_name: string
  scale: string | null
  remark?: string | null
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
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedCollection = collections.find(
    (collection) => collection.id === value
  )

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const showSuggestions = open && inputValue.trim().length >= 2

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          role="combobox"
          aria-expanded={open}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(selectedCollection && "border-primary pr-8")}
        />
        {selectedCollection && (
          <Check className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        )}
      </div>

      {open && inputValue.trim().length > 0 && inputValue.trim().length < 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          Type at least 2 characters to search...
        </div>
      )}

      {showSuggestions && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {collections.length > 0 && (
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Existing collections (click to reuse)
              </div>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  role="option"
                  aria-selected={value === collection.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onValueChange(collection)
                    onInputChange(collection.name)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === collection.id ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{collection.name}</span>
                      {collection.item_no && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {collection.item_no}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {collection.brand_name}
                      {collection.scale && ` • ${collection.scale}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className={cn("p-1", collections.length > 0 && "border-t")}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onValueChange(null)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
            >
              <Plus className="h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1">
                <span className="font-medium text-primary">
                  Add new collection &quot;{inputValue}&quot;
                </span>
                {collections.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    With the brand/scale/item no set below
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
