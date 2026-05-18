"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar/sidebar"
import { AppNavSheet } from "@/components/navigation/app-nav-sheet"
import { MobileNavHeader } from "@/components/navigation/mobile-nav-header"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/collection": "Collection",
  "/catalog": "Catalog",
  "/purchase/list": "Purchases",
  "/purchase/add": "New Purchase",
  "/management/brands": "Brands",
  "/management/shops": "Shops",
  "/management/image-import": "Image Import",
  "/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith("/management/")) return "Management"
  if (pathname.startsWith("/purchase/")) return "Purchases"
  return "Diecast Tracker"
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const pathname = usePathname()

  const isLoginPage = pathname === "/login"
  const isCatalogPage = pathname.startsWith("/catalog")

  if (isLoginPage) {
    return <>{children}</>
  }

  const pageTitle = getPageTitle(pathname)

  if (isCatalogPage) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNavHeader title={pageTitle} onMenuClick={() => setNavOpen(true)} />
        <AppNavSheet open={navOpen} onOpenChange={setNavOpen} />

        <main className="flex-1 overflow-y-auto bg-background text-foreground">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
