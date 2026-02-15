"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface PageBreadcrumbProps {
  customSegments?: BreadcrumbSegment[]
}

// Map of route segments to readable labels
const routeLabels: Record<string, string> = {
  purchase: "Purchases",
  add: "Add Purchase",
  list: "Purchase List",
  collection: "Collection",
  categories: "Categories",
  management: "Management",
  brands: "Brands",
  shops: "Shops",
  settings: "Settings",
}

export function PageBreadcrumb({ customSegments }: PageBreadcrumbProps) {
  const pathname = usePathname()

  // If custom segments are provided, use them
  if (customSegments) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {customSegments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {segment.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={segment.href}>{segment.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // Auto-generate breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return null // Don't show breadcrumb on home page
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          const href = `/${segments.slice(0, index + 1).join("/")}`
          const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          return (
            <div key={segment + index} className="flex items-center gap-2">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

