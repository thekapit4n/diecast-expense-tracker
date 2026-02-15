"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { ShopsGrid, ShopsGridRef, type ShopItem } from "@/components/management/shops-grid"
import { ShopFormModal } from "@/components/management/shop-form-modal"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"

export default function ShopsPage() {
  const gridRef = useRef<ShopsGridRef>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<ShopItem | null>(null)

  const handleReload = useCallback(() => {
    gridRef.current?.reload()
  }, [])

  const handleEdit = useCallback((shop: ShopItem) => {
    setEditingShop(shop)
    setFormOpen(true)
  }, [])

  const handleFormSuccess = useCallback(() => {
    setEditingShop(null)
    setFormOpen(false)
    gridRef.current?.reload()
  }, [])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Management</h1>
          <p className="text-muted-foreground">
            View and manage shop information
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingShop(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Shop
          </Button>
          <Button
            onClick={handleReload}
            variant="outline"
            size="icon"
            aria-label="Reload shops"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ShopsGrid ref={gridRef} onEdit={handleEdit} />

      <ShopFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingShop(null)
        }}
        shop={editingShop}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
