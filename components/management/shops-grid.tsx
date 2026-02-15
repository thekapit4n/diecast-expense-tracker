"use client"

import {
  useMemo,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ICellRendererParams } from "ag-grid-community"
import { ModuleRegistry } from "ag-grid-community"
import { AllEnterpriseModule, SetFilterModule } from "ag-grid-enterprise"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"

ModuleRegistry.registerModules([AllEnterpriseModule, SetFilterModule])

export interface ShopItem {
  id: string
  shop_name: string | null
  address: string | null
  country: string | null
}

export interface ShopsGridRef {
  reload: () => void
}

interface ShopsGridProps {
  onEdit?: (shop: ShopItem) => void
}

export const ShopsGrid = forwardRef<ShopsGridRef, ShopsGridProps>(
  ({ onEdit }, ref) => {
    const [reloadKey, setReloadKey] = useState(0)
    const [shops, setShops] = useState<ShopItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [shopToDelete, setShopToDelete] = useState<ShopItem | null>(null)
    const supabase = createClient()

    const fetchShops = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error: fetchError } = await supabase
          .from("tbl_shop_information")
          .select("id, shop_name, address, country")
          .order("shop_name", { ascending: true })

        if (fetchError) throw fetchError
        setShops((data as ShopItem[]) ?? [])
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to fetch shops"
        setError(msg)
        toast.error(`Error loading shops: ${msg}`)
        console.error("Error fetching shops:", err)
      } finally {
        setLoading(false)
      }
    }, [supabase])

    const reload = useCallback(() => {
      fetchShops()
      setReloadKey((k) => k + 1)
    }, [fetchShops])

    useEffect(() => {
      fetchShops()
    }, [fetchShops])

    useImperativeHandle(ref, () => ({ reload }), [reload])

    const handleEdit = useCallback(
      (shop: ShopItem) => {
        onEdit?.(shop)
      },
      [onEdit]
    )

    const handleDeleteClick = useCallback((shop: ShopItem) => {
      setShopToDelete(shop)
      setDeleteDialogOpen(true)
    }, [])

    const handleDeleteConfirm = useCallback(async () => {
      if (!shopToDelete) return
      try {
        const { error: deleteError } = await supabase
          .from("tbl_shop_information")
          .delete()
          .eq("id", shopToDelete.id)
        if (deleteError) throw deleteError
        toast.success("Shop removed")
        setDeleteDialogOpen(false)
        setShopToDelete(null)
        reload()
      } catch (e) {
        console.error(e)
        toast.error("Failed to remove shop")
      }
    }, [supabase, reload, shopToDelete])

    const handleDeleteCancel = useCallback(() => {
      setDeleteDialogOpen(false)
      setShopToDelete(null)
    }, [])

    const columnDefs: ColDef<ShopItem>[] = useMemo(
      () => [
        {
          field: "shop_name",
          headerName: "Shop Name",
          sortable: true,
          filter: "agTextColumnFilter",
          flex: 2,
          minWidth: 200,
          valueFormatter: (p) => p.value ?? "",
          filterParams: {
            filterOptions: [
              "contains",
              "notContains",
              "equals",
              "notEqual",
              "startsWith",
              "endsWith",
            ],
            defaultOption: "contains",
            buttons: ["reset", "apply"],
            closeOnApply: true,
          },
        },
        {
          field: "address",
          headerName: "Address",
          sortable: true,
          filter: "agTextColumnFilter",
          flex: 2,
          minWidth: 200,
          valueFormatter: (p) => p.value ?? "",
          filterParams: {
            filterOptions: [
              "contains",
              "notContains",
              "equals",
              "notEqual",
              "startsWith",
              "endsWith",
            ],
            defaultOption: "contains",
            buttons: ["reset", "apply"],
            closeOnApply: true,
          },
        },
        {
          field: "country",
          headerName: "Country",
          sortable: true,
          filter: "agTextColumnFilter",
          width: 140,
          valueFormatter: (p) => p.value ?? "",
          filterParams: {
            filterOptions: ["contains", "equals", "startsWith"],
            defaultOption: "contains",
            buttons: ["reset", "apply"],
            closeOnApply: true,
          },
        },
        {
          headerName: "Actions",
          width: 120,
          sortable: false,
          filter: false,
          cellRenderer: (params: ICellRendererParams<ShopItem>) => {
            if (!params.data) return null
            const shop = params.data
            return (
              <div className="flex items-center gap-1 h-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(shop)}
                  aria-label="Edit shop"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(shop)}
                  aria-label="Delete shop"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          },
        },
      ],
      [handleEdit, handleDeleteClick]
    )

    const defaultColDef = useMemo(
      () => ({
        resizable: true,
        sortable: true,
        filter: true,
      }),
      []
    )

    if (loading) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading shops...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
            <Button onClick={reload} variant="default">
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return (
      <>
        <div
          className="ag-theme-quartz w-full h-[calc(100vh-12rem)]"
          key={reloadKey}
        >
          <AgGridReact<ShopItem>
            theme="legacy"
            rowData={shops}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={100}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            animateRows
            domLayout="normal"
          />
        </div>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setShopToDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove shop?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove this shop from the list? Existing purchases will keep
                their stored shop details but will no longer link to this shop.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeleteCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }
)

ShopsGrid.displayName = "ShopsGrid"
