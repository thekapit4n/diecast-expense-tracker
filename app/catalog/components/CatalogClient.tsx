"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Search, SlidersHorizontal, X, Menu,
  Home, Car, ShoppingCart, Settings2, List, PlusCircle, Tag, Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
import BrandTabs from "./BrandTabs"
import DiecastCard from "./DiecastCard"
import CardDetailSheet from "./CardDetailSheet"
import FilterSortSheet, { type FilterState } from "./FilterSortSheet"
import type { CatalogBrand, CatalogItem } from "../page"

interface CatalogClientProps {
  items: CatalogItem[]
  brands: CatalogBrand[]
  defaultBrand: string | null
}

const INITIAL_VISIBLE = 20
const LOAD_MORE_BATCH = 20

/* Extract numeric series from item_no e.g. "MGT00123" → 123 */
function getSeriesNumber(itemNo: string | null): number {
  if (!itemNo) return 999999
  const match = itemNo.match(/\d+/)
  return match ? parseInt(match[0], 10) : 999999
}

/* ---- Navigation groups shown in the burger menu ---- */
const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
    ],
  },
  {
    label: "Collection",
    items: [
      { href: "/collection", label: "List", icon: List },
      { href: "/catalog", label: "Catalog", icon: Car },
    ],
  },
  {
    label: "Purchases",
    items: [
      { href: "/purchase/list", label: "List", icon: ShoppingCart },
      { href: "/purchase/add", label: "New Purchase", icon: PlusCircle },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/management/brands", label: "Brand", icon: Tag },
      { href: "/management/shops", label: "Shop", icon: Store },
    ],
  },
]

export default function CatalogClient({ items, brands, defaultBrand }: CatalogClientProps) {
  const [search, setSearch] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string | null>(defaultBrand)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    scales: [],
    sort: "series_asc",
  })

  /* Unique scales derived from data */
  const scales = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => { if (item.scale) set.add(item.scale) })
    return Array.from(set).sort()
  }, [items])

  /* Active filter count for badge indicator */
  const activeFilterCount =
    filters.brands.length + filters.scales.length + (filters.sort !== "series_asc" ? 1 : 0)

  /* Filtered + sorted list */
  const filtered = useMemo(() => {
    let list = [...items]

    if (selectedBrand) {
      list = list.filter((i) => i.brand_name.toLowerCase() === selectedBrand.toLowerCase())
    }
    if (filters.brands.length > 0) {
      list = list.filter((i) =>
        filters.brands.some((b) => i.brand_name.toLowerCase() === b.toLowerCase())
      )
    }
    if (filters.scales.length > 0) {
      list = list.filter((i) => i.scale && filters.scales.includes(i.scale))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.item_no?.toLowerCase().includes(q) ?? false) ||
          i.brand_name.toLowerCase().includes(q) ||
          (i.scale?.toLowerCase().includes(q) ?? false)
      )
    }

    switch (filters.sort) {
      case "oldest":
        list = list.reverse()
        break
      case "name_asc":
        list = list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name_desc":
        list = list.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "series_asc":
        list = list.sort((a, b) => getSeriesNumber(a.item_no) - getSeriesNumber(b.item_no))
        break
      default:
        break
    }

    return list
  }, [items, selectedBrand, filters, search])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  function handleBrandChange(brand: string | null) {
    setSelectedBrand(brand)
    setVisibleCount(INITIAL_VISIBLE)
  }
  function handleFiltersChange(next: FilterState) {
    setFilters(next)
    setVisibleCount(INITIAL_VISIBLE)
  }
  function handleSearchChange(value: string) {
    setSearch(value)
    setVisibleCount(INITIAL_VISIBLE)
  }

  return (
    /*
     * Max-width keeps the layout centered on desktop while staying
     * full-bleed on mobile — no sidebar, no container padding.
     */
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-[#0B0B0C] lg:max-w-none">

      {/* ------------------------------------------------------------------ */}
      {/* Sticky Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-[#27272A] bg-[#0B0B0C]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">

          {/* Title / stats */}
          <div className={cn("transition-all", searchOpen ? "hidden" : "flex items-center gap-2")}>
            {/* Burger menu */}
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="rounded-full p-1.5 text-[#A1A1AA] transition hover:bg-[#16181D] hover:text-[#F4F4F5]"
              aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#F4F4F5]">Diecast Catalog</h1>
              <p className="text-[11px] text-[#A1A1AA]">
                {items.length} {items.length === 1 ? "Model" : "Models"} · {brands.length}{" "}
                {brands.length === 1 ? "Brand" : "Brands"}
              </p>
            </div>
          </div>

          {/* Inline search input */}
          {searchOpen && (
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525B]" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search models, brands, codes..."
                  className="h-9 border-[#27272A] bg-[#16181D] pl-8 pr-4 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus-visible:ring-[#3B82F6]"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); handleSearchChange("") }}
                className="rounded-full p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Action icons */}
          {!searchOpen && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="rounded-full p-2 text-[#A1A1AA] transition hover:bg-[#16181D] hover:text-[#F4F4F5]"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={cn(
                  "relative rounded-full p-2 transition hover:bg-[#16181D]",
                  activeFilterCount > 0 ? "text-[#FF3B30]" : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                )}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
                {activeFilterCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF3B30] text-[8px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Brand tabs */}
        <div className="pb-3 pt-0.5">
          <BrandTabs brands={brands} selected={selectedBrand} onChange={handleBrandChange} />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Results summary bar                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <p className="text-xs text-[#52525B]">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
          {search && (
            <span className="ml-1">
              for &ldquo;<span className="text-[#A1A1AA]">{search}</span>&rdquo;
            </span>
          )}
        </p>
        {(activeFilterCount > 0 || search || selectedBrand) && (
          <button
            type="button"
            onClick={() => {
              handleFiltersChange({ brands: [], scales: [], sort: "newest" })
              handleSearchChange("")
              setSelectedBrand(null)
            }}
            className="text-xs text-[#FF3B30] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Grid                                                                */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 px-3 pb-10">
        {items.length === 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-2xl bg-[#16181D]" />
                <Skeleton className="h-3 w-3/4 rounded bg-[#16181D]" />
                <Skeleton className="h-3 w-1/2 rounded bg-[#16181D]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl">🔍</div>
            <p className="mt-3 text-sm font-semibold text-[#F4F4F5]">No models found</p>
            <p className="mt-1 text-xs text-[#71717A]">Try a different search or filter</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visible.map((item) => (
                <DiecastCard key={item.id} item={item} onClick={setSelectedItem} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + LOAD_MORE_BATCH)}
                  className="border-[#27272A] bg-transparent text-[#A1A1AA] hover:border-[#3B82F6] hover:bg-[#16181D] hover:text-[#F4F4F5]"
                >
                  Load more ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Drawers                                                             */}
      {/* ------------------------------------------------------------------ */}
      <CardDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
      <FilterSortSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        brands={brands}
        scales={scales}
        filters={filters}
        onChange={handleFiltersChange}
      />

      {/* ---- Burger nav sheet ---- */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="w-72 border-[#27272A] bg-[#16181D] p-0 text-[#F4F4F5]"
        >
          <SheetHeader className="border-b border-[#27272A] px-5 py-4">
            <SheetTitle className="text-left text-base font-bold text-[#F4F4F5]">
              Diecast Tracker
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 overflow-y-auto px-3 py-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 mt-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isCurrent = item.href === "/catalog"
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        isCurrent
                          ? "bg-[#FF3B30]/10 font-semibold text-[#FF3B30]"
                          : "text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#F4F4F5]"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
