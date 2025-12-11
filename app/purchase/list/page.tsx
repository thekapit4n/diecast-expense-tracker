"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { PurchaseGrid, PurchaseGridRef } from "@/components/purchase/purchase-grid"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { useRouter } from "next/navigation"

export default function PurchaseListPage() {
  const purchaseGridRef = useRef<PurchaseGridRef>(null)
  const router = useRouter()

  const handleReload = () => {
    purchaseGridRef.current?.reload()
  }

  const handleAddPurchase = () => {
    router.push("/purchase/add")
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase List</h1>
          <p className="text-muted-foreground">
            View and manage all diecast purchases
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddPurchase} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Add Purchase
          </Button>
          <Button onClick={handleReload} variant="outline" size="icon" aria-label="Reload purchases">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PurchaseGrid ref={purchaseGridRef} />
    </div>
  )
}

