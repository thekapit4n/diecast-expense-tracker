"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Home, List, Plus, Folder, Settings, ChevronLeft, ChevronRight, Car, ReceiptText, PackageSearch, Building2, Settings2, ChevronDown, Tag, ShoppingCart, PlusCircle, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

interface MenuItem {
  href?: string
  label: string
  icon: any
  children?: MenuItem[]
  onClick?: () => void
  variant?: 'default' | 'destructive'
}

function MenuItemComponent({ item, pathname, isCollapsed }: { item: MenuItem; pathname: string; isCollapsed: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = item.icon

  if (item.children) {
    const hasActiveChild = item.children.some((child) => child.href === pathname)
    const shouldBeOpen = hasActiveChild || isOpen

    return (
      <div>
        <Button
          variant={hasActiveChild ? "secondary" : "ghost"}
          onClick={() => !isCollapsed && setIsOpen(!isOpen)}
          className={cn(
            "w-full justify-start gap-3",
            isCollapsed && "justify-center px-0",
            hasActiveChild && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  shouldBeOpen && "rotate-180"
                )}
              />
            </>
          )}
        </Button>
        {!isCollapsed && shouldBeOpen && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children.map((child) => {
              const ChildIcon = child.icon
              const isActive = pathname === child.href

              return (
                <Link key={child.href} href={child.href || "#"}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 text-sm",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <ChildIcon className="h-4 w-4 shrink-0" />
                    <span>{child.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActive = pathname === item.href

  // Handle onClick items (like logout)
  if (item.onClick) {
    return (
      <Button
        variant={item.variant === 'destructive' ? "destructive" : (isActive ? "secondary" : "ghost")}
        onClick={item.onClick}
        className={cn(
          "w-full justify-start gap-3",
          isCollapsed && "justify-center px-0",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </Button>
    )
  }

  // Handle href items (navigation)
  return (
    <Link href={item.href || "#"}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3",
          isCollapsed && "justify-center px-0",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </Button>
    </Link>
  )
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const menuItems: MenuItem[] = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/collection", label: "My Collection", icon: Car },
    
    {
      label: "Purchases",
      icon: ShoppingCart,
      children: [
        { href: "/purchase/list", label: "List", icon: List },
        { href: "/purchase/add", label: "New Purchase", icon: PlusCircle },
      ],
    },
    {
      label: "Management",
      icon: Settings2,
      children: [
        { href: "/management/brands", label: "Brand", icon: Tag },
      ],
    },
    { href: "/categories", label: "Categories", icon: Folder },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/preorders", label: "Preorders", icon: PackageSearch },
    { href: "/dioramas", label: "Dioramas", icon: Building2 },
    { onClick: signOut, label: "Logout", icon: LogOut },
  ]

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Diecast Tracker
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <MenuItemComponent
            key={item.href || item.label}
            item={item}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* User Info */}
      {!isCollapsed && (
        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.email || 'Loading...'}</p>
              <p className="text-xs text-muted-foreground">Logged in</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

