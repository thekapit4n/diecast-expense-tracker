"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Menu, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { colors, tw } from "@/lib/theme/diecast-theme"
import { AppNavSheet } from "@/components/navigation/app-nav-sheet"
import BrandTabs from "./BrandTabs"
import DiecastCard from "./DiecastCard"
import CardDetailSheet from "./CardDetailSheet"
import FilterSortSheet, { type FilterState } from "./FilterSortSheet"
import type { CatalogBrand, CatalogItem } from "../page"

interface CatalogClientProps {
  items: CatalogItem[]
  brands: CatalogBrand[]
  defaultBrand: string | null
  initialSearch?: string
  initialBrand?: string
}

const INITIAL_VISIBLE = 20
const LOAD_MORE_BATCH = 20

const nameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

function isMiniGTBrand(brand: string | null): boolean {
  return brand?.trim().toLowerCase() === "mini gt"
}

function resolveSortForBrands(
  brands: string[],
  sort: FilterState["sort"]
): FilterState["sort"] {
  if (brands.length > 0 && brands.every((brand) => isMiniGTBrand(brand))) {
    return sort === "name_desc" ? "name_desc" : "series_asc"
  }
  return sort === "series_asc" ? "name_asc" : sort
}

/** Always returns a new sorted array — never mutates the input. */
function sortCatalogItems(
  list: CatalogItem[],
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
    filterBrands.length > 0 && filterBrands.every((brand) => isMiniGTBrand(brand))

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

export default function CatalogClient({
  items,
  brands,
  defaultBrand,
  initialSearch = "",
  initialBrand,
}: CatalogClientProps) {
  const router = useRouter()
  const [isReloading, startReload] = useTransition()
  const [imageReloadBust, setImageReloadBust] = useState<number | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const activeBrand = initialBrand ?? defaultBrand
  const [filters, setFilters] = useState<FilterState>({
    brands: activeBrand ? [activeBrand] : [],
    scales: [],
    sort: isMiniGTBrand(activeBrand) ? "series_asc" : "name_asc",
  })

  /* Sentinel ref for infinite scroll */
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement | null>(null)

  /* Open search bar when arriving from collection/purchase list with ?search=MGT00001 */
  useEffect(() => {
    if (initialSearch) {
      setSearchOpen(true)
    }
  }, [initialSearch])

  /* Keep open detail sheet in sync after server refresh */
  useEffect(() => {
    const selectedId = selectedItem?.id
    if (!selectedId) return
    const updated = items.find((entry) => entry.id === selectedId)
    if (updated) {
      setSelectedItem(updated)
    }
  }, [items, selectedItem?.id])

  const scales = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => { if (item.scale) set.add(item.scale) })
    return Array.from(set).sort()
  }, [items])

  const activeFilterCount =
    filters.brands.length + filters.scales.length + (filters.sort !== "name_asc" ? 1 : 0)

  const filtered = useMemo(() => {
    let list = [...items]

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

    return sortCatalogItems(list, filters.brands, filters.sort)
  }, [items, filters, search])

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
      { root: scrollRef.current, rootMargin: "200px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  function handleBrandTabsChange(brands: string[]) {
    setVisibleCount(INITIAL_VISIBLE)
    setFilters((prev) => ({
      ...prev,
      brands,
      sort: resolveSortForBrands(brands, prev.sort),
    }))
  }

  function handleFiltersChange(next: FilterState) {
    setVisibleCount(INITIAL_VISIBLE)
    setFilters({
      ...next,
      sort: resolveSortForBrands(next.brands, next.sort),
    })
  }
  function handleSearchChange(value: string) {
    setSearch(value)
    setVisibleCount(INITIAL_VISIBLE)
  }

  function handleReload() {
    setImageReloadBust(Date.now())
    startReload(() => {
      router.refresh()
    })
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col bg-background lg:max-w-none">

      {/* ------------------------------------------------------------------ */}
      {/* Sticky Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <header className={tw.headerSticky}>
        <div className="flex items-center justify-between px-4 py-3">

          <div className={cn("transition-all", searchOpen ? "hidden" : "flex items-center gap-2")}>
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-card hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <div>
              <h1 className={cn("text-base font-bold tracking-tight", tw.textTitle)}>Diecast Catalog</h1>
              <p className="text-[11px] text-muted-foreground">
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
                  className={cn("h-9 pl-8 pr-4 text-sm", tw.input)}
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); handleSearchChange("") }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {!searchOpen && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleReload}
                disabled={isReloading}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:opacity-50"
                aria-label="Reload catalog"
                title="Reload catalog"
              >
                {isReloading ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <RefreshCw className="h-[18px] w-[18px]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={cn(
                  "relative rounded-full p-2 transition hover:bg-card",
                  activeFilterCount > 0 ? tw.accent : "text-muted-foreground hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ backgroundColor: colors.accent.default }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="pb-3 pt-0.5">
          <BrandTabs
            brands={brands}
            selectedBrands={filters.brands}
            onChange={handleBrandTabsChange}
          />
        </div>
      </header>

      {/* Results bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <p className="text-xs text-[#52525B]">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
          {search && (
            <span className="ml-1">
              for &ldquo;<span className="text-muted-foreground">{search}</span>&rdquo;
            </span>
          )}
        </p>
        {(activeFilterCount > 0 || search || filters.brands.length > 0) && (
          <button
            type="button"
            onClick={() => {
              handleFiltersChange({ brands: [], scales: [], sort: "name_asc" })
              handleSearchChange("")
            }}
            className={cn("text-xs hover:underline", tw.accent)}
          >
            Clear all
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Grid                                                                */}
      {/* ------------------------------------------------------------------ */}
      <main
        ref={scrollRef}
        className={cn("min-h-0 flex-1 overflow-y-auto px-3 pb-10", tw.scrollbarCatalog)}
      >
        {items.length === 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-2xl bg-card" />
                <Skeleton className="h-3 w-3/4 rounded bg-card" />
                <Skeleton className="h-3 w-1/2 rounded bg-card" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl">🔍</div>
            <p className="mt-3 text-sm font-semibold text-foreground">No models found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a different search or filter</p>
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

            {hasMore && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className={cn("h-3.5 w-3.5 animate-spin text-primary")} />
                <span className={cn("text-[11px] font-medium", tw.textTitle)}>Loading more…</span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Drawers */}
      <CardDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onReload={handleReload}
        isReloading={isReloading}
        imageReloadBust={imageReloadBust}
      />
      <FilterSortSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        brands={brands}
        scales={scales}
        filters={filters}
        onChange={handleFiltersChange}
      />

      <AppNavSheet open={navOpen} onOpenChange={setNavOpen} />
    </div>
  )
}
