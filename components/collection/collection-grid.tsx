"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry } from "ag-grid-community"
import { AllEnterpriseModule, SetFilterModule } from "ag-grid-enterprise"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// Register AG Grid modules (Enterprise only)
// AllEnterpriseModule includes all Enterprise features
// SetFilterModule explicitly included to ensure it's available
ModuleRegistry.registerModules([AllEnterpriseModule, SetFilterModule])

// Type definition for collection items
export interface CollectionItem {
  id: string
  name: string
  item_no: string | null
  brand_id: number | null
  brand_name: string
  scale: string | null
  remark: string | null
  created_at: number | null
  created_by: string | null
  updated_at: number | null
  updated_by: string | null
}

export function CollectionGrid() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("tbl_collection")
        .select(`
          id,
          name,
          item_no,
          brand_id,
          scale,
          remark,
          created_at,
          created_by,
          updated_at,
          updated_by,
          tbl_master_brand(name)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      const formattedData: CollectionItem[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        item_no: item.item_no,
        brand_id: item.brand_id,
        brand_name: item.tbl_master_brand?.name || "Unknown",
        scale: item.scale,
        remark: item.remark,
        created_at: item.created_at,
        created_by: item.created_by,
        updated_at: item.updated_at,
        updated_by: item.updated_by,
      }))

      setCollections(formattedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections'
      setError(errorMessage)
      toast.error(`Error loading collections: ${errorMessage}`)
      console.error('Error fetching collections:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  // Column definitions
  const columnDefs: ColDef<CollectionItem>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        sortable: true,
        filter: 'agTextColumnFilter',
        flex: 2,
        minWidth: 200,
        filterParams: {
          filterOptions: ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith'],
          defaultOption: 'contains',
          buttons: ['reset', 'apply'],
          closeOnApply: true,
        },
      },
      {
        field: "item_no",
        headerName: "Item No",
        sortable: true,
        filter: 'agTextColumnFilter',
        width: 120,
        filterParams: {
          filterOptions: ['contains', 'equals', 'startsWith'],
          defaultOption: 'contains',
          buttons: ['reset', 'apply'],
          closeOnApply: true,
        },
      },
      {
        field: "brand_name",
        headerName: "Brand",
        sortable: true,
        filter: 'agTextColumnFilter',
        flex: 1.5,
        minWidth: 150,
        filterParams: {
          filterOptions: ['contains', 'equals', 'startsWith'],
          defaultOption: 'contains',
          buttons: ['reset', 'apply'],
          closeOnApply: true,
        },
      },
      {
        field: "scale",
        headerName: "Scale",
        sortable: true,
        filter: 'agTextColumnFilter',
        width: 100,
        filterParams: {
          filterOptions: ['equals', 'contains'],
          defaultOption: 'equals',
          buttons: ['reset', 'apply'],
          closeOnApply: true,
        },
      },
      {
        field: "remark",
        headerName: "Remark",
        sortable: true,
        filter: 'agTextColumnFilter',
        flex: 1,
        minWidth: 200,
        filterParams: {
          filterOptions: ['contains', 'equals'],
          defaultOption: 'contains',
          buttons: ['reset', 'apply'],
          closeOnApply: true,
        },
      },
      {
        field: "created_at",
        headerName: "Created At",
        sortable: true,
        filter: 'agDateColumnFilter',
        width: 150,
        valueFormatter: (params) => {
          if (params.value) {
            // Convert epoch timestamp to date
            const date = new Date(params.value * 1000)
            return date.toLocaleDateString("en-GB")
          }
          return ""
        },
        filterParams: {
          filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
          defaultOption: 'equals',
          buttons: ['reset', 'apply'],
          closeOnApply: true,
          comparator: (filterDate: Date, cellValue: number | null) => {
            if (!cellValue) return -1
            const cellDate = new Date(cellValue * 1000)
            cellDate.setHours(0, 0, 0, 0)
            filterDate.setHours(0, 0, 0, 0)
            if (cellDate < filterDate) return -1
            if (cellDate > filterDate) return 1
            return 0
          },
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
          <p className="text-muted-foreground">Loading collections...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
          <Button onClick={fetchCollections} variant="default">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="ag-theme-quartz w-full h-[calc(100vh-12rem)]">
      <AgGridReact<CollectionItem>
        theme="legacy"
        rowData={collections}
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
}

