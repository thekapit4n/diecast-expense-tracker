"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { navGroups } from "@/lib/theme/nav-config"
import { tw } from "@/lib/theme/diecast-theme"
import { AppNavLink } from "./app-nav-link"

interface AppNavMenuProps {
  collapsed?: boolean
  onNavigate?: () => void
  className?: string
}

export function AppNavMenu({ collapsed, onNavigate, className }: AppNavMenuProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex-1 space-y-1 overflow-y-auto p-3", tw.textTitle, className)}>
      {navGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && <p className={tw.navGroupLabel}>{group.label}</p>}
          {group.items.map((item) => (
            <AppNavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  )
}
