"use client"

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useCallback } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry, ICellRendererParams, GetContextMenuItemsParams, MenuItemDef } from "ag-grid-community"
import { AllEnterpriseModule, SetFilterModule } from "ag-grid-enterprise"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EditPurchaseModal } from "./edit-purchase-modal"

// Register AG Grid modules (Enterprise only)
ModuleRegistry.registerModules([AllEnterpriseModule, SetFilterModule])

// Payment Status Badge Component
function PaymentStatusBadge({ value }: { value: string | null }) {
  if (!value) return null
  
  const status = value.toLowerCase()
  const colors: Record<string, string> = {
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    unpaid: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    refunded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }
  
  const colorClass = colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

// Edition Type Badge Component
function EditionTypeBadge({ value }: { value: string | null }) {
  if (!value) return null
  
  const editionType = value.toLowerCase().replace(/_/g, ' ')
  
  // Capitalize each word
  const displayText = editionType
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  // If normal, just return plain text without badge
  if (editionType === 'normal') {
    return <span className="text-sm text-gray-600 dark:text-gray-400">{displayText}</span>
  }
  
  const colors: Record<string, string> = {
    'event car': "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
    'ltd': "bg-blue-900 text-blue-100 dark:bg-blue-950 dark:text-blue-200",
    'black edition': "bg-gray-900 text-white dark:bg-black dark:text-gray-100",
  }
  
  const colorClass = colors[editionType] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {displayText}
    </span>
  )
}

export interface PurchaseItem {
  id: string
  collection_id: string
  collection_name: string
  item_no: string | null
  brand_name: string
  scale: string | null
  quantity: number
  price_per_unit: number
  total_price: number
  purchase_type: string | null
  platform: string | null
  pre_order_status: string | null
  pre_order_date: string | null
  payment_status: string | null
  payment_method: string | null
  payment_date: string | null
  arrival_date: string | null
  url_link: string | null
  is_chase: boolean
  edition_type: string | null
  packaging_type: string | null
  size_detail: string | null
  has_acrylic: boolean
  shop_name: string | null
  address: string | null
  country: string | null
  remark: string | null
}

export interface PurchaseGridRef {
  reload: () => void
}

export const PurchaseGrid = forwardRef<PurchaseGridRef>((props, ref) => {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("tbl_purchase")
        .select(`
          id,
          collection_id,
          quantity,
          price_per_unit,
          total_price,
          purchase_type,
          platform,
          pre_order_status,
          pre_order_date,
          payment_status,
          payment_method,
          payment_date,
          arrival_date,
          url_link,
          is_chase,
          edition_type,
          packaging_type,
          size_detail,
          has_acrylic,
          shop_name,
          address,
          country,
          remark,
          tbl_collection!inner(
            name,
            item_no,
            scale,
            tbl_master_brand(name)
          )
        `)

      if (error) {
        throw error
      }

      const formattedData: PurchaseItem[] = (data || []).map((item: any) => ({
        id: item.id,
        collection_id: item.collection_id,
        collection_name: item.tbl_collection.name,
        item_no: item.tbl_collection.item_no,
        brand_name: item.tbl_collection.tbl_master_brand?.name || "Unknown",
        scale: item.tbl_collection.scale,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        total_price: item.total_price,
        purchase_type: item.purchase_type,
        platform: item.platform,
        pre_order_status: item.pre_order_status,
        pre_order_date: item.pre_order_date,
        payment_status: item.payment_status,
        payment_method: item.payment_method,
        payment_date: item.payment_date,
        arrival_date: item.arrival_date,
        url_link: item.url_link,
        is_chase: item.is_chase,
        edition_type: item.edition_type,
        packaging_type: item.packaging_type,
        size_detail: item.size_detail,
        has_acrylic: item.has_acrylic,
        shop_name: item.shop_name,
        address: item.address,
        country: item.country,
        remark: item.remark,
      }))

      // Sort by collection name ascending
      const sortedData = formattedData.sort((a, b) => 
        a.collection_name.localeCompare(b.collection_name)
      )

      setPurchases(sortedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchases'
      setError(errorMessage)
      toast.error(`Error loading purchases: ${errorMessage}`)
      console.error('Error fetching purchases:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const reload = useCallback(() => {
    fetchPurchases()
  }, [fetchPurchases])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  useImperativeHandle(ref, () => ({
    reload,
  }))

  const columnDefs: ColDef<PurchaseItem>[] = useMemo(() => [
    {
      headerName: "Collection Name",
      field: "collection_name",
      filter: 'agTextColumnFilter',
      flex: 2,
      minWidth: 200,
      sort: 'asc',
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
      flex: 1,
      minWidth: 150,
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith'],
        defaultOption: 'contains',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "quantity",
      headerName: "Quantity",
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      type: "numericColumn",
      filterParams: {
        filterOptions: ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'inRange'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "price_per_unit",
      headerName: "Price/Unit (RM)",
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 140,
      type: "numericColumn",
      valueFormatter: (params) => {
        return params.value != null ? `RM ${params.value.toFixed(2)}` : ""
      },
      filterParams: {
        filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "total_price",
      headerName: "Total Price (RM)",
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 150,
      type: "numericColumn",
      valueFormatter: (params) => {
        return params.value != null ? `RM ${params.value.toFixed(2)}` : ""
      },
      filterParams: {
        filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "purchase_type",
      headerName: "Purchase Type",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 130,
      cellRenderer: (params: any) => {
        if (!params.value) return ""
        return params.value.charAt(0).toUpperCase() + params.value.slice(1)
      },
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "platform",
      headerName: "Platform",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 130,
      hide: true,
      cellRenderer: (params: any) => {
        if (!params.value) return ""
        return params.value.charAt(0).toUpperCase() + params.value.slice(1)
      },
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "payment_status",
      headerName: "Payment Status",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 140,
      cellRenderer: (params: ICellRendererParams<PurchaseItem>) => {
        if (!params.data) return null
        return <PaymentStatusBadge value={params.data.payment_status} />
      },
      valueGetter: (params) => {
        return params.data?.payment_status || ""
      },
      filterParams: {
        filterOptions: ['equals', 'notEqual'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "payment_method",
      headerName: "Payment Method",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 140,
      hide: true,
      filterParams: {
        filterOptions: ['equals', 'contains'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "payment_date",
      headerName: "Payment Date",
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 140,
      valueFormatter: (params) => {
        if (!params.value) return ""
        return new Date(params.value).toLocaleDateString("en-GB")
      },
      filterParams: {
        filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
        comparator: (filterDate: Date, cellValue: string) => {
          if (!cellValue) return -1
          const cellDate = new Date(cellValue)
          cellDate.setHours(0, 0, 0, 0)
          filterDate.setHours(0, 0, 0, 0)
          if (cellDate < filterDate) return -1
          if (cellDate > filterDate) return 1
          return 0
        },
      },
    },
    {
      field: "scale",
      headerName: "Scale",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 100,
      hide: true,
      filterParams: {
        filterOptions: ['equals', 'contains'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "pre_order_status",
      headerName: "Pre-Order Status",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 140,
      hide: true,
      filterParams: {
        filterOptions: ['equals', 'contains'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "pre_order_date",
      headerName: "Pre-Order Date",
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 140,
      hide: true,
      valueFormatter: (params) => {
        if (!params.value) return ""
        return new Date(params.value).toLocaleDateString("en-GB")
      },
      filterParams: {
        filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
        buttons: ['reset', 'apply'],
        closeOnApply: true,
        comparator: (filterDate: Date, cellValue: string) => {
          if (!cellValue) return -1
          const cellDate = new Date(cellValue)
          cellDate.setHours(0, 0, 0, 0)
          filterDate.setHours(0, 0, 0, 0)
          if (cellDate < filterDate) return -1
          if (cellDate > filterDate) return 1
          return 0
        },
      },
    },
    {
      field: "arrival_date",
      headerName: "Arrival Date",
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 140,
      hide: true,
      valueFormatter: (params) => {
        if (!params.value) return ""
        return new Date(params.value).toLocaleDateString("en-GB")
      },
      filterParams: {
        filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
        buttons: ['reset', 'apply'],
        closeOnApply: true,
        comparator: (filterDate: Date, cellValue: string) => {
          if (!cellValue) return -1
          const cellDate = new Date(cellValue)
          cellDate.setHours(0, 0, 0, 0)
          filterDate.setHours(0, 0, 0, 0)
          if (cellDate < filterDate) return -1
          if (cellDate > filterDate) return 1
          return 0
        },
      },
    },
    {
      field: "is_chase",
      headerName: "Is Chase?",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 110,
      hide: true,
      valueFormatter: (params) => (params.value ? "Yes" : "No"),
      filterParams: {
        filterOptions: ['equals'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "edition_type",
      headerName: "Edition Type",
      sortable: true,
      filter: 'agSetColumnFilter',
      width: 140,
      cellRenderer: (params: ICellRendererParams<PurchaseItem>) => {
        if (!params.data) return null
        return <EditionTypeBadge value={params.data.edition_type} />
      },
      valueGetter: (params) => {
        if (!params.data?.edition_type) return ""
        return params.data.edition_type.replace(/_/g, ' ')
      },
      filterParams: {
        values: ['normal', 'event car', 'ltd', 'black edition'],
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "packaging_type",
      headerName: "Packaging Type",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      hide: true,
      filterParams: {
        filterOptions: ['equals', 'contains'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "size_detail",
      headerName: "Size Detail",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      hide: true,
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'contains',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "has_acrylic",
      headerName: "Has Acrylic?",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 120,
      hide: true,
      valueFormatter: (params) => (params.value ? "Yes" : "No"),
      filterParams: {
        filterOptions: ['equals'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "shop_name",
      headerName: "Shop Name",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      hide: true,
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith'],
        defaultOption: 'contains',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "address",
      headerName: "Address",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
      hide: true,
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'contains',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "country",
      headerName: "Country",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 130,
      hide: true,
      filterParams: {
        filterOptions: ['equals', 'contains'],
        defaultOption: 'equals',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "url_link",
      headerName: "URL Link",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
      hide: true,
      cellRenderer: (params: any) => {
        if (!params.value) return ""
        return `<a href="${params.value}" target="_blank" class="text-blue-600 hover:underline">${params.value}</a>`
      },
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'contains',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
    {
      field: "remark",
      headerName: "Remark",
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
      hide: true,
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'contains',
        buttons: ['reset', 'apply'],
        closeOnApply: true,
      },
    },
  ], [])

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  )

  const getContextMenuItems = useCallback(
    (params: GetContextMenuItemsParams<PurchaseItem>) => {
      const result: any[] = [
        "copy",
        "copyWithHeaders",
        "separator",
        "export",
      ]

      // Add "Edit" option only when right-clicking on collection_name column
      if (params.column && params.column.getColId() === "collection_name") {
        result.unshift({
          name: "Edit Purchase",
          icon: '<span class="ag-icon ag-icon-edit"></span>',
          action: () => {
            if (params.node && params.node.data) {
              setSelectedPurchaseId(params.node.data.id)
              setEditModalOpen(true)
            }
          },
        })
        result.unshift("separator")
      }

      return result
    },
    []
  )

  const handleEditSuccess = useCallback(() => {
    reload()
  }, [reload])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading purchases...</p>
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
      <div className="ag-theme-quartz w-full h-[calc(100vh-12rem)]">
        {loading ? null : (
          <AgGridReact<PurchaseItem>
            theme="legacy"
            rowData={purchases}
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
            getContextMenuItems={getContextMenuItems as any}
          />
        )}
      </div>

      {/* Edit Purchase Modal */}
      {selectedPurchaseId && (
        <EditPurchaseModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          purchaseId={selectedPurchaseId}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
})

PurchaseGrid.displayName = "PurchaseGrid"

