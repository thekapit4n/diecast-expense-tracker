"use client"

import { useMemo, useState, useCallback, useImperativeHandle, forwardRef, useEffect } from "react"
import { AgGridPanel } from "@/components/ag-grid/ag-grid-panel"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry, ICellRendererParams } from "ag-grid-community"
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
import { tw } from "@/lib/theme/diecast-theme"

// Register AG Grid modules (Enterprise only)
ModuleRegistry.registerModules([AllEnterpriseModule, SetFilterModule])

// Type definition for brand items
export interface Brand {
  id: number
  name: string
  type: string
  isactive: number
}

/** How many catalog items and purchases point at a brand. */
interface BrandUsage {
  collections: number
  purchases: number
}

// Status Badge Component
function StatusBadge({ value }: { value: number }) {
  const isActive = value === 1
  const statusText = isActive ? "Active" : "Inactive"
  const statusColors = isActive ? tw.badgePaid : tw.badgeInactive

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors}`}>
      {statusText}
    </span>
  )
}

export interface BrandsGridRef {
  reload: () => void
}

interface BrandsGridProps {
  onEdit?: (brand: Brand) => void
}

export const BrandsGrid = forwardRef<BrandsGridRef, BrandsGridProps>(
  ({ onEdit }, ref) => {
    const [reloadKey, setReloadKey] = useState(0)
    const [brandsDataState, setBrandsDataState] = useState<Brand[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null)
    const [usage, setUsage] = useState<BrandUsage | null>(null)
    const [deleting, setDeleting] = useState(false)
    const supabase = createClient()

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('tbl_master_brand')
        .select('*')
        .order('id', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      if (data) {
        setBrandsDataState(data as Brand[])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch brands'
      setError(errorMessage)
      toast.error(`Error loading brands: ${errorMessage}`)
      console.error('Error fetching brands:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const reload = useCallback(() => {
    fetchBrands()
    setReloadKey((prev) => prev + 1)
  }, [fetchBrands])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  useImperativeHandle(ref, () => ({
    reload,
  }))

    const handleEdit = useCallback(
      (brand: Brand) => {
        onEdit?.(brand)
      },
      [onEdit]
    )

    /**
     * Both tbl_collection.brand_id and tbl_purchase.brand_id are declared
     * ON DELETE SET NULL, so deleting a brand silently unlinks every record
     * that used it — no error, just orphaned rows. Count them first so the
     * confirmation can say exactly what is about to happen.
     */
    const handleDeleteClick = useCallback(
      async (brand: Brand) => {
        setBrandToDelete(brand)
        setUsage(null)
        setDeleteDialogOpen(true)

        const [collections, purchases] = await Promise.all([
          supabase
            .from("tbl_collection")
            .select("id", { count: "exact", head: true })
            .eq("brand_id", brand.id),
          supabase
            .from("tbl_purchase")
            .select("id", { count: "exact", head: true })
            .eq("brand_id", brand.id),
        ])

        if (collections.error || purchases.error) {
          console.error(collections.error ?? purchases.error)
          toast.error("Could not check where this brand is used")
          return
        }

        setUsage({
          collections: collections.count ?? 0,
          purchases: purchases.count ?? 0,
        })
      },
      [supabase]
    )

    const handleDeleteConfirm = useCallback(async () => {
      if (!brandToDelete) return
      setDeleting(true)
      try {
        const { error: deleteError } = await supabase
          .from("tbl_master_brand")
          .delete()
          .eq("id", brandToDelete.id)
        if (deleteError) throw deleteError
        toast.success(`Brand "${brandToDelete.name}" deleted`)
        setDeleteDialogOpen(false)
        setBrandToDelete(null)
        setUsage(null)
        reload()
      } catch (e) {
        console.error(e)
        const message = e instanceof Error ? e.message : "Unknown error"
        toast.error(`Failed to delete brand: ${message}`)
      } finally {
        setDeleting(false)
      }
    }, [supabase, reload, brandToDelete])

    /** The safe alternative to deleting: keeps every existing link intact. */
    const handleDeactivate = useCallback(async () => {
      if (!brandToDelete) return
      setDeleting(true)
      try {
        const { error: updateError } = await supabase
          .from("tbl_master_brand")
          .update({ isactive: 0 })
          .eq("id", brandToDelete.id)
        if (updateError) throw updateError
        toast.success(`Brand "${brandToDelete.name}" set to inactive`)
        setDeleteDialogOpen(false)
        setBrandToDelete(null)
        setUsage(null)
        reload()
      } catch (e) {
        console.error(e)
        toast.error("Failed to deactivate brand")
      } finally {
        setDeleting(false)
      }
    }, [supabase, reload, brandToDelete])

  // Column definitions
  const columnDefs: ColDef<Brand>[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        filter: true,
        width: 80,
        type: "numericColumn",
        valueFormatter: (params) => {
          return params.value?.toString() || ""
        },
      },
      {
        field: "name",
        headerName: "Brand Name",
        sortable: true,
        filter: true,
        flex: 2,
        minWidth: 200,
      },
      {
        field: "type",
        headerName: "Cateogory",
        sortable: true,
        filter: true,
        flex: 2,
        minWidth: 200,
      },
      {
        field: "isactive",
        headerName: "Status",
        sortable: true,
        filter: true,
        width: 120,
        cellRenderer: (params: ICellRendererParams<Brand>) => {
          if (!params.data) return null
          return <StatusBadge value={params.data.isactive} />
        },
        valueGetter: (params) => {
          return params.data?.isactive === 1 ? "Active" : "Inactive"
        },
        filterParams: {
          values: ["Active", "Inactive"],
        },
      },
      {
        headerName: "Actions",
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<Brand>) => {
          if (!params.data) return null
          const brand = params.data
          return (
            <div className="flex items-center gap-1 h-full">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(brand)}
                aria-label={`Edit ${brand.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDeleteClick(brand)}
                aria-label={`Delete ${brand.name}`}
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading brands...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="mb-4 text-destructive">Error: {error}</p>
          <Button onClick={reload} variant="default">
            Retry
          </Button>
        </div>
      </div>
    )
  }

    const linkedCount = (usage?.collections ?? 0) + (usage?.purchases ?? 0)

    return (
      <>
        <AgGridPanel key={reloadKey}>
          {(popupParent) => (
            <AgGridReact<Brand>
              theme="legacy"
              rowData={brandsDataState}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSize={100}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              animateRows={true}
              rowSelection={{
                mode: "singleRow",
                enableClickSelection: true,
              }}
              domLayout="normal"
              popupParent={popupParent}
            />
          )}
        </AgGridPanel>

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) {
              setBrandToDelete(null)
              setUsage(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &quot;{brandToDelete?.name}&quot;?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  {usage === null ? (
                    <p>Checking where this brand is used...</p>
                  ) : linkedCount === 0 ? (
                    <p>
                      Nothing is using this brand, so it is safe to delete. This
                      cannot be undone.
                    </p>
                  ) : (
                    <>
                      <p>
                        This brand is used by{" "}
                        <strong>
                          {usage.collections} catalog item
                          {usage.collections === 1 ? "" : "s"}
                        </strong>{" "}
                        and{" "}
                        <strong>
                          {usage.purchases} purchase
                          {usage.purchases === 1 ? "" : "s"}
                        </strong>
                        .
                      </p>
                      <p>
                        Deleting it will not remove those records, but it will
                        leave every one of them with no brand. They will show as
                        blank in the catalog and in reports, and the link cannot
                        be restored by re-adding a brand with the same name.
                      </p>
                      <p>
                        To retire the brand without touching those records, set
                        it to <strong>Inactive</strong> instead.
                      </p>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              {linkedCount > 0 && brandToDelete?.isactive === 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeactivate}
                  disabled={deleting || usage === null}
                >
                  Set inactive
                </Button>
              )}
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteConfirm()
                }}
                disabled={deleting || usage === null}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }
)

BrandsGrid.displayName = "BrandsGrid"
