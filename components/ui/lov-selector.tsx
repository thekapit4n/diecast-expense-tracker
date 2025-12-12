"use client"

import * as React from "react"
import { Search, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface LOVItem {
  id: string | number
  label: string
  sublabel?: string
  meta?: Record<string, any>
}

interface LOVSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  items: LOVItem[]
  value?: string | number
  onValueChange: (value: string | number, item: LOVItem) => void
  searchPlaceholder?: string
  renderItem?: (item: LOVItem, isSelected: boolean) => React.ReactNode
  emptyMessage?: string
  groupBy?: (item: LOVItem) => string
  onReload?: () => void
  isReloading?: boolean
}

export function LOVSelector({
  open,
  onOpenChange,
  title,
  description,
  items,
  value,
  onValueChange,
  searchPlaceholder = "Search...",
  renderItem,
  emptyMessage = "No items found.",
  groupBy,
  onReload,
  isReloading = false,
}: LOVSelectorProps) {
  const [search, setSearch] = React.useState("")

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!search) return items

    const searchLower = search.toLowerCase()
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchLower) ||
        item.sublabel?.toLowerCase().includes(searchLower)
    )
  }, [items, search])

  // Group items if groupBy function is provided
  const groupedItems = React.useMemo(() => {
    if (!groupBy) return null

    const groups: Record<string, LOVItem[]> = {}
    filteredItems.forEach((item) => {
      const groupKey = groupBy(item)
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })
    return groups
  }, [filteredItems, groupBy])

  const handleSelect = (item: LOVItem) => {
    onValueChange(item.id, item)
    onOpenChange(false)
    setSearch("") // Reset search on close
  }

  const handleClose = () => {
    onOpenChange(false)
    setSearch("") // Reset search on close
  }

  const defaultRenderItem = (item: LOVItem, isSelected: boolean) => (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex-1">
        <div className={cn(
          "text-sm font-semibold",
          isSelected ? "text-white dark:text-white" : "text-gray-900 dark:text-stone-200"
        )}>
          {item.label}
        </div>
        {item.sublabel && (
          <div className={cn(
            "text-xs font-normal mt-0.5",
            isSelected ? "text-white dark:text-white" : "text-gray-500 dark:text-stone-400"
          )}>
            {item.sublabel}
          </div>
        )}
      </div>
    </div>
  )

  const itemRenderer = renderItem || defaultRenderItem

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg md:max-w-full md:w-[700px] lg:w-[800px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{title}</DialogTitle>
              {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
            </div>
            {onReload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
                disabled={isReloading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isReloading && "animate-spin")} />
                Reload
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 py-4 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 bg-background"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-center">
              <div className="space-y-2">
                <p className="text-lg text-muted-foreground">{emptyMessage}</p>
                {search && (
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            </div>
          ) : groupedItems ? (
            // Render grouped items
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                <div key={groupName}>
                  <div className="mb-3 px-4 py-2.5 text-sm font-semibold text-primary bg-primary/10 rounded-md border border-primary/20">
                    {groupName}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({groupItems.length} {groupItems.length === 1 ? "item" : "items"})
                    </span>
                  </div>
                  <div className="space-y-0">
                    {groupItems.map((item) => {
                      const isSelected = value === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "w-full text-left text-sm py-2 px-5 border-b border-slate-100 dark:border-stone-700 cursor-pointer rounded-md transition-all",
                            "hover:bg-slate-100 dark:hover:bg-stone-700 focus:outline-none",
                            isSelected
                              ? "!bg-sky-700 dark:!bg-sky-600 font-semibold text-white"
                              : "bg-white dark:bg-stone-800 dark:text-stone-200"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            {itemRenderer(item, isSelected)}
                            {isSelected && (
                              <div className="flex-shrink-0 ml-3 h-5 w-5 rounded-full bg-white text-sky-700 flex items-center justify-center text-xs font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Render flat list
            <div className="space-y-0">
              {filteredItems.map((item) => {
                const isSelected = value === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full text-left text-sm py-2 px-5 border-b border-slate-100 dark:border-stone-700 cursor-pointer rounded-md transition-all",
                      "hover:bg-slate-100 dark:hover:bg-stone-700 focus:outline-none",
                      isSelected
                        ? "!bg-sky-700 dark:!bg-sky-600 font-semibold text-white"
                        : "bg-white dark:bg-stone-800 dark:text-stone-200"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      {itemRenderer(item, isSelected)}
                      {isSelected && (
                        <div className="flex-shrink-0 ml-3 h-5 w-5 rounded-full bg-white text-sky-700 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
