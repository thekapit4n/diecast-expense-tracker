"use client"

import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"
import { navGroups } from "@/lib/theme/nav-config"
import { tw } from "@/lib/theme/diecast-theme"
import { AppNavLink } from "@/components/navigation/app-nav-link"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-sidebar-foreground">Diecast Tracker</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("ml-auto text-muted-foreground hover:text-foreground", isCollapsed && "mx-auto")}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && <p className={tw.navGroupLabel}>{group.label}</p>}
            {group.items.map((item) => (
              <AppNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={isCollapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </Button>

        {!isCollapsed && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-card/50 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{user?.email || "Loading..."}</p>
              <p className="text-xs text-muted-foreground">Logged in</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
