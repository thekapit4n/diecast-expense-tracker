"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Search, SlidersHorizontal, X, Menu,
  Home, Car, ShoppingCart, List, PlusCircle, Tag, Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
import BrandTabs from "./BrandTabs"
import DiecastCard from "./DiecastCard"
import CardDetailSheet from "./CardDetailSheet"
import FilterSortSheet, { type FilterState } from "./FilterSortSheet"
import type { CatalogBrand, CatalogItem } from "../page"

/* Car-paint accent — teal-blue #3c647b, green #669a62 */
const MG = {
  accent: "#3c647b",
  accentBg: "bg-[#3c647b]",
  accentText: "text-[#3c647b]",
  accentRing: "ring-[#3c647b]",
  accentBgFaint: "bg-[#3c647b]/15",
  accentBorder: "border-[#3c647b]",
}

interface CatalogClientProps {
  items: CatalogItem[]
  brands: CatalogBrand[]
  defaultBrand: string | null
  initialSearch?: string
}

const INITIAL_VISIBLE = 20
const LOAD_MORE_BATCH = 20

const nameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

function isMiniGTBrand(brand: string | null): boolean {
  return brand?.trim().toLowerCase() === "mini gt"
}

/** Always returns a new sorted array — never mutates the input. */
function sortCatalogItems(
  list: CatalogItem[],
  selectedBrand: string | null,
  filterBrands: string[],
  userSort: FilterState["sort"]
): CatalogItem[] {
  const byNameAsc = (a: CatalogItem, b: CatalogItem) =>
    nameCollator.compare(a.name.trim(), b.name.trim())
  const byNameDesc = (a: CatalogItem, b: CatalogItem) =>
    nameCollator.compare(b.name.trim(), a.name.trim())
  const byItemNo = (a: CatalogItem, b: CatalogItem) => {
    const aNo = a.item_no?.trim() ?? ""
    const bNo = b.item_no?.trim() ?? ""
    if (!aNo && !bNo) return byNameAsc(a, b)
    if (!aNo) return 1
    if (!bNo) return -1
    const diff = nameCollator.compare(aNo, bNo)
    return diff !== 0 ? diff : byNameAsc(a, b)
  }

  const viewingMiniGT =
    isMiniGTBrand(selectedBrand) ||
    (filterBrands.length === 1 && isMiniGTBrand(filterBrands[0]))

  /* Non–Mini GT brands: always sort by name (ignore series_asc / stale sort values). */
  if (!viewingMiniGT) {
    return userSort === "name_desc"
      ? [...list].sort(byNameDesc)
      : [...list].sort(byNameAsc)
  }

  /* Mini GT: respect user sort choice. */
  switch (userSort) {
    case "name_desc":
      return [...list].sort(byNameDesc)
    case "name_asc":
      return [...list].sort(byNameAsc)
    case "series_asc":
    default:
      return [...list].sort(byItemNo)
  }
}

const NAV_GROUPS = [
  {
    label: "Main",
    items: [{ href: "/", label: "Dashboard", icon: Home }],
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

export default function CatalogClient({
  items,
  brands,
  defaultBrand,
  initialSearch = "",
}: CatalogClientProps) {
  const [search, setSearch] = useState(initialSearch)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(defaultBrand)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    scales: [],
    sort: isMiniGTBrand(defaultBrand) ? "series_asc" : "name_asc",
  })

  /* Sentinel ref for infinite scroll */
  const sentinelRef = useRef<HTMLDivElement>(null)

  /* Open search bar when arriving from collection/purchase list with ?search=MGT00001 */
  useEffect(() => {
    if (initialSearch) {
      setSearchOpen(true)
    }
  }, [initialSearch])

  /* Keep sort in sync when brand tab changes (covers any code path that updates selectedBrand). */
  useEffect(() => {
    const expected: FilterState["sort"] = isMiniGTBrand(selectedBrand)
      ? "series_asc"
      : "name_asc"
    setFilters((prev) => (prev.sort === expected ? prev : { ...prev, sort: expected }))
  }, [selectedBrand])

  const scales = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => { if (item.scale) set.add(item.scale) })
    return Array.from(set).sort()
  }, [items])

  const activeFilterCount =
    filters.brands.length + filters.scales.length + (filters.sort !== "name_asc" ? 1 : 0)

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

    return sortCatalogItems(list, selectedBrand, filters.brands, filters.sort)
  }, [items, selectedBrand, filters, search])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  /* Infinite scroll — observe sentinel at bottom of grid */
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((c) => c + LOAD_MORE_BATCH)
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  /* Reset visible count + apply sensible default sort when brand tab changes */
  function handleBrandChange(brand: string | null) {
    setSelectedBrand(brand)
    setVisibleCount(INITIAL_VISIBLE)
    setFilters((prev) => ({
      ...prev,
      sort: isMiniGTBrand(brand) ? "series_asc" : "name_asc",
    }))
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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-[#0b1822] lg:max-w-none">

      {/* ------------------------------------------------------------------ */}
      {/* Sticky Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-[#1d3344] bg-[#0b1822]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">

          <div className={cn("transition-all", searchOpen ? "hidden" : "flex items-center gap-2")}>
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="rounded-full p-1.5 text-[#A1A1AA] transition hover:bg-[#122030] hover:text-[#F4F4F5]"
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

          {searchOpen && (
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525B]" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search models, brands, codes..."
                  className="h-9 border-[#1d3344] bg-[#122030] pl-8 pr-4 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus-visible:ring-[#3c647b]"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); handleSearchChange("") }}
                className="rounded-full p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#122030]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

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
                  "relative rounded-full p-2 transition hover:bg-[#122030]",
                  activeFilterCount > 0 ? MG.accentText : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                )}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ backgroundColor: MG.accent }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="pb-3 pt-0.5">
          <BrandTabs brands={brands} selected={selectedBrand} onChange={handleBrandChange} />
        </div>
      </header>

      {/* Results bar */}
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
              handleFiltersChange({ brands: [], scales: [], sort: "name_asc" })
              handleSearchChange("")
              setSelectedBrand(null)
            }}
            className={cn("text-xs hover:underline", MG.accentText)}
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
                <Skeleton className="aspect-square w-full rounded-2xl bg-[#122030]" />
                <Skeleton className="h-3 w-3/4 rounded bg-[#122030]" />
                <Skeleton className="h-3 w-1/2 rounded bg-[#122030]" />
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

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-10" />

            {/* Subtle loading indicator */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <span className="text-xs text-[#2a4555]">Loading more…</span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Drawers */}
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
          showCloseButton={false}
          className="w-72 border-[#1d3344] bg-[#0e1c28] p-0 text-[#F4F4F5]"
        >
          <SheetClose
            className="group absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:border-[rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <X className="h-4 w-4 text-[#94A3B8] transition-colors group-hover:text-[#B6FFF2]" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetHeader
            className="border-b px-5 py-4 pr-14"
            style={{ borderColor: "rgba(125,211,252,0.06)" }}
          >
            <SheetTitle className="text-left text-base font-bold text-[#F4F4F5]">
              Diecast Tracker
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 overflow-y-auto px-3 py-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p
                  className="mb-1 mt-2 px-2 text-[10px] font-semibold uppercase text-[#4B6B88]"
                  style={{ letterSpacing: "0.14em" }}
                >
                  {group.label}
                </p>
                {group.items.map((navItem) => {
                  const Icon = navItem.icon
                  const isCurrent = navItem.href === "/catalog"
                  return (
                    <Link
                      key={navItem.href}
                      href={navItem.href}
                      onClick={() => setNavOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        isCurrent
                          ? "bg-[rgba(45,212,191,0.08)] font-semibold text-[#99F6E4]"
                          : "text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#B6FFF2]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isCurrent
                            ? "text-[#5EEAD4] drop-shadow-[0_0_8px_rgba(45,212,191,0.25)]"
                            : "text-[#94A3B8] group-hover:text-[#B6FFF2]"
                        )}
                      />
                      {navItem.label}
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
