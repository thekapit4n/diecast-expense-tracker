"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { tw } from "@/lib/theme/diecast-theme"
import { AppNavFooter } from "@/components/navigation/app-nav-footer"
import { AppNavMenu } from "@/components/navigation/app-nav-menu"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        {!isCollapsed && (
          <h2 className={cn("text-sm font-semibold", tw.textTitle)}>Diecast Tracker</h2>
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

      <AppNavMenu collapsed={isCollapsed} />

      <AppNavFooter collapsed={isCollapsed} />
    </aside>
  )
}
