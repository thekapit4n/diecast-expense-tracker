"use client"

import { X } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { colors, tw } from "@/lib/theme/diecast-theme"
import { AppNavFooter } from "./app-nav-footer"
import { AppNavMenu } from "./app-nav-menu"

interface AppNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppNavSheet({ open, onOpenChange }: AppNavSheetProps) {
  const handleNavigate = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className={cn("flex w-72 flex-col border-border bg-[#0e1c28] p-0", tw.textTitle)}
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
          <SheetTitle className={cn("text-left text-sm font-semibold", tw.textTitle)}>
            Diecast Tracker
          </SheetTitle>
        </SheetHeader>

        <AppNavMenu onNavigate={handleNavigate} className="px-3 py-3" />

        <AppNavFooter onAfterLogout={handleNavigate} />
      </SheetContent>
    </Sheet>
  )
}
