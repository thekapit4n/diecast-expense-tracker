"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Check, Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

interface ThemeToggleProps {
  collapsed?: boolean
}

/**
 * Light / Dark / System picker. Lives in the nav footer, which both the desktop
 * sidebar and the mobile sheet render, so one instance covers every viewport.
 */
export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // The server renders the default (dark) because it can't know the stored
  // choice, so hold that icon until hydration rather than flashing the wrong one.
  React.useEffect(() => setMounted(true), [])

  const Icon = mounted && resolvedTheme === "light" ? Sun : Moon
  const activeLabel = OPTIONS.find((o) => o.value === theme)?.label ?? "Theme"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Theme: ${mounted ? activeLabel : "Dark"}`}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:bg-accent hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{mounted ? activeLabel : "Theme"}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={collapsed ? "right" : "top"}>
        {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className="gap-2"
          >
            <OptionIcon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {mounted && theme === value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
