"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Theme switching for the admin portal.
 *
 * Note the `value` map: dark mode applies the class `theme-dark`, which
 * deliberately matches no CSS rule — `:root` in globals.css already *is* the
 * dark palette. Light mode applies `.light`, which overrides it. Doing it this
 * way (rather than the conventional `:root` = light + `.dark` = dark) means the
 * dormant shadcn `dark:` variants stay dormant and dark mode renders exactly as
 * it did before the switcher existed.
 *
 * `defaultTheme="dark"` with `enableSystem` means a user who has never chosen
 * resolves to dark, not to their OS preference — System is opt-in.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      value={{ light: "light", dark: "theme-dark" }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
