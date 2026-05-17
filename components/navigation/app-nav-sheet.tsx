"use client"

import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { navGroups } from "@/lib/theme/nav-config"
import { colors, tw } from "@/lib/theme/diecast-theme"
import { AppNavLink } from "./app-nav-link"

interface AppNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppNavSheet({ open, onOpenChange }: AppNavSheetProps) {
  const pathname = usePathname()

  const handleNavigate = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 border-border bg-[#0e1c28] p-0 text-foreground"
      >
        <SheetClose
          className="group absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:border-[rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          style={{
            backgroundColor: colors.nav.closeBg,
            borderColor: colors.border.navClose,
          }}
        >
          <X className="h-4 w-4 text-[#94A3B8] transition-colors group-hover:text-[#B6FFF2]" />
          <span className="sr-only">Close</span>
        </SheetClose>

        <SheetHeader
          className="border-b px-5 py-4 pr-14"
          style={{ borderColor: colors.border.navHeader }}
        >
          <SheetTitle className="text-left text-base font-bold text-foreground">
            Diecast Tracker
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 overflow-y-auto px-3 py-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className={tw.navGroupLabel}>{group.label}</p>
              {group.items.map((navItem) => (
                <AppNavLink
                  key={navItem.href}
                  item={navItem}
                  pathname={pathname}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
