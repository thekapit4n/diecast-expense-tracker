import type { LucideIcon } from "lucide-react"
import {
  Home,
  Car,
  List,
  ShoppingCart,
  PlusCircle,
  Tag,
  Store,
  PackageSearch,
  LayoutGrid,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [{ href: "/", label: "Dashboard", icon: Home }],
  },
  {
    label: "Collection",
    items: [
      { href: "/collection", label: "List", icon: List },
      { href: "/catalog", label: "Catalog", icon: LayoutGrid },
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
      { href: "/management/image-import", label: "Image Import", icon: PackageSearch },
    ],
  },
]

/** Catalog header uses Car icon for catalog link in some contexts */
export const catalogNavIcon = Car

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
