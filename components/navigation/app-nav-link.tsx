"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { isNavItemActive } from "@/lib/theme/nav-config"
import type { NavItem } from "@/lib/theme/nav-config"
import { tw } from "@/lib/theme/diecast-theme"

interface AppNavLinkProps {
  item: NavItem
  pathname: string
  onNavigate?: () => void
  collapsed?: boolean
}

export function AppNavLink({ item, pathname, onNavigate, collapsed }: AppNavLinkProps) {
  const Icon = item.icon
  const isActive = isNavItemActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        collapsed && "justify-center px-2",
        isActive
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : cn(tw.navItemText, "hover:bg-[rgba(255,255,255,0.03)] hover:text-[#bfe9ff]")
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          collapsed ? "h-5 w-5" : "",
          isActive
            ? "text-[#5EEAD4] drop-shadow-[0_0_8px_rgba(45,212,191,0.25)]"
            : cn(tw.navItemText, "group-hover:text-[#bfe9ff]")
        )}
      />
      {!collapsed && item.label}
    </Link>
  )
}
