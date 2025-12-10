"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { BrandsGrid, BrandsGridRef } from "@/components/management/brands-grid"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"

export default function BrandsPage() {
  const brandsGridRef = useRef<BrandsGridRef>(null)

  const handleReload = () => {
    brandsGridRef.current?.reload()
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Management</h1>
          <p className="text-muted-foreground">
            View and manage all diecast brands
          </p>
        </div>
        <Button onClick={handleReload} variant="outline" size="icon" aria-label="Reload brands">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <BrandsGrid ref={brandsGridRef} />
    </div>
  )
}

