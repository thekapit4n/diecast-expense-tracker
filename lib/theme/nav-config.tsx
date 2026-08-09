import type { ComponentType } from "react"
import { Car } from "lucide-react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Analytics01Icon,
  TaskDaily01Icon,
  GarageIcon,
  WalletDone01Icon,
  ShoppingCartAdd02Icon,
  DeliveryDelay02Icon,
  TagsIcon,
  StoreLocation02Icon,
  ImageDownload02Icon,
} from "@hugeicons/core-free-icons"

/** A nav icon just needs to accept `className` — satisfied by both Lucide
 * icon components and the HugeIcons wrappers below, so items can mix icon
 * sources as they get migrated one at a time. */
type NavIcon = ComponentType<{ className?: string }>

function hugeIcon(icon: IconSvgElement): NavIcon {
  return function NavHugeIcon({ className }) {
    return <HugeiconsIcon icon={icon} className={className} />
  }
}

const DashboardIcon = hugeIcon(Analytics01Icon)
const CollectionListIcon = hugeIcon(TaskDaily01Icon)
const CatalogIcon = hugeIcon(GarageIcon)
const PurchaseListIcon = hugeIcon(WalletDone01Icon)
const NewPurchaseIcon = hugeIcon(ShoppingCartAdd02Icon)
const PreorderTrackerIcon = hugeIcon(DeliveryDelay02Icon)
const BrandIcon = hugeIcon(TagsIcon)
const ShopIcon = hugeIcon(StoreLocation02Icon)
const ImageImportIcon = hugeIcon(ImageDownload02Icon)

export interface NavItem {
  href: string
  label: string
  icon: NavIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [{ href: "/", label: "Dashboard", icon: DashboardIcon }],
  },
  {
    label: "Collection",
    items: [
      { href: "/collection", label: "List", icon: CollectionListIcon },
      { href: "/catalog", label: "Catalog", icon: CatalogIcon },
    ],
  },
  {
    label: "Purchases",
    items: [
      { href: "/purchase/list", label: "List", icon: PurchaseListIcon },
      { href: "/purchase/add", label: "New Purchase", icon: NewPurchaseIcon },
      { href: "/purchase/preorders", label: "Pre-order Tracker", icon: PreorderTrackerIcon },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/management/brands", label: "Brand", icon: BrandIcon },
      { href: "/management/shops", label: "Shop", icon: ShopIcon },
      { href: "/management/image-import", label: "Image Import", icon: ImageImportIcon },
    ],
  },
]

/** Catalog header uses Car icon for catalog link in some contexts */
export const catalogNavIcon = Car

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
