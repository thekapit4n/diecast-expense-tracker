"use client"

import { LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"

interface AppNavFooterProps {
  collapsed?: boolean
  onAfterLogout?: () => void
}

export function AppNavFooter({ collapsed, onAfterLogout }: AppNavFooterProps) {
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    onAfterLogout?.()
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        onClick={handleSignOut}
        className={cn(
          "w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          collapsed && "justify-center px-0"
        )}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        {!collapsed && <span>Logout</span>}
      </Button>

      {!collapsed && (
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
  )
}
