"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { BrandsGrid, BrandsGridRef, type Brand } from "@/components/management/brands-grid"
import { BrandFormModal } from "@/components/management/brand-form-modal"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { tw } from "@/lib/theme/diecast-theme"

export default function BrandsPage() {
  const brandsGridRef = useRef<BrandsGridRef>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

  const handleReload = useCallback(() => {
    brandsGridRef.current?.reload()
  }, [])

  const handleEdit = useCallback((brand: Brand) => {
    setEditingBrand(brand)
    setFormOpen(true)
  }, [])

  const handleFormSuccess = useCallback(() => {
    setEditingBrand(null)
    setFormOpen(false)
    brandsGridRef.current?.reload()
  }, [])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className={tw.pageHeading}>Brand Management</h1>
          <p className="text-muted-foreground">
            View and manage all diecast brands
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingBrand(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
          <Button
            onClick={handleReload}
            variant="outline"
            size="icon"
            aria-label="Reload brands"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BrandsGrid ref={brandsGridRef} onEdit={handleEdit} />

      <BrandFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingBrand(null)
        }}
        brand={editingBrand}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
