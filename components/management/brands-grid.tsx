"use client"

import { useMemo, useState, useCallback, useImperativeHandle, forwardRef, useEffect } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry, ICellRendererParams } from "ag-grid-community"
import { AllEnterpriseModule, SetFilterModule } from "ag-grid-enterprise"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// Register AG Grid modules (Enterprise only)
ModuleRegistry.registerModules([AllEnterpriseModule, SetFilterModule])

// Type definition for brand items
export interface Brand {
  id: number
  name: string
  type: string
  isactive: number
}

// Status Badge Component
function StatusBadge({ value }: { value: number }) {
  const isActive = value === 1
  const statusText = isActive ? "Active" : "Inactive"
  const statusColors = isActive
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors}`}>
      {statusText}
    </span>
  )
}

export interface BrandsGridRef {
  reload: () => void
}

export const BrandsGrid = forwardRef<BrandsGridRef>((props, ref) => {
  const [reloadKey, setReloadKey] = useState(0)
  const [brandsDataState, setBrandsDataState] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    ],
    []
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
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
          <Button onClick={reload} variant="default">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="ag-theme-quartz w-full h-[calc(100vh-12rem)]" key={reloadKey}>
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
      />
    </div>
  )
})

BrandsGrid.displayName = "BrandsGrid"

