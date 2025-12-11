"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar/sidebar"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Don't show sidebar on login page
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

