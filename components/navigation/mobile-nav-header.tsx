"use client"

import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavHeaderProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
  className?: string
  children?: React.ReactNode
}

export function MobileNavHeader({
  title,
  subtitle,
  onMenuClick,
  className,
  children,
}: MobileNavHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-card hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </header>
  )
}
