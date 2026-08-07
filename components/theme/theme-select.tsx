"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Theme picker for the Settings page. Applies immediately — unlike the rest of
 * that page, there is no Save step.
 */
export function ThemeSelect() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  return (
    <Select
      value={mounted ? theme : "dark"}
      onValueChange={setTheme}
      disabled={!mounted}
    >
      <SelectTrigger id="theme" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  )
}
