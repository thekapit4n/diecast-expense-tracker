"use client"

import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry } from "ag-grid-community"
import { AllEnterpriseModule, SetFilterModule } from "ag-grid-enterprise"
import { format } from "date-fns"

// Register AG Grid modules (Enterprise only)
// AllEnterpriseModule includes all Enterprise features
// SetFilterModule explicitly included to ensure it's available
ModuleRegistry.registerModules([AllEnterpriseModule, SetFilterModule])

// Type definition for collection items
export interface CollectionItem {
  id: string
  itemName: string
  category: string
  brand: string
  scale: string
  purchaseDate: Date
  purchasePrice: number
  currency: string
  condition: string
  status: string
  description?: string
}

// Dummy data for collection
const dummyCollectionData: CollectionItem[] = [
  {
    id: "1",
    itemName: "Nissan Skyline GT-R R34",
    category: "Hot Wheels",
    brand: "Hot Wheels Premium",
    scale: "1:64",
    purchaseDate: new Date("2024-01-15"),
    purchasePrice: 25.99,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "2024 Premium series",
  },
  {
    id: "2",
    itemName: "Porsche 911 GT3",
    category: "Matchbox",
    brand: "Matchbox Collectors",
    scale: "1:64",
    purchaseDate: new Date("2024-01-10"),
    purchasePrice: 18.50,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "Collectors edition",
  },
  {
    id: "3",
    itemName: "Ford Mustang GT",
    category: "Greenlight",
    brand: "Greenlight Models",
    scale: "1:64",
    purchaseDate: new Date("2024-01-05"),
    purchasePrice: 45.00,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "1:64 scale",
  },
  {
    id: "4",
    itemName: "Lamborghini Aventador",
    category: "Hot Wheels",
    brand: "Hot Wheels RLC",
    scale: "1:64",
    purchaseDate: new Date("2023-12-20"),
    purchasePrice: 35.00,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "Red Line Club exclusive",
  },
  {
    id: "5",
    itemName: "Tesla Model 3",
    category: "Matchbox",
    brand: "Matchbox",
    scale: "1:64",
    purchaseDate: new Date("2023-12-15"),
    purchasePrice: 12.99,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "Basic series",
  },
  {
    id: "6",
    itemName: "Toyota Supra MK4",
    category: "Hot Wheels",
    brand: "Hot Wheels Premium",
    scale: "1:64",
    purchaseDate: new Date("2024-02-01"),
    purchasePrice: 28.50,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "2024 Premium series",
  },
  {
    id: "7",
    itemName: "BMW M3 E46",
    category: "Greenlight",
    brand: "Greenlight Models",
    scale: "1:64",
    purchaseDate: new Date("2024-01-20"),
    purchasePrice: 42.00,
    currency: "USD",
    condition: "New",
    status: "Pre-ordered",
    description: "Pre-order - Arriving March 2024",
  },
  {
    id: "8",
    itemName: "Dodge Charger Hellcat",
    category: "Auto World",
    brand: "Auto World",
    scale: "1:64",
    purchaseDate: new Date("2023-11-10"),
    purchasePrice: 15.99,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "Ultra Red series",
  },
  {
    id: "9",
    itemName: "McLaren P1",
    category: "Hot Wheels",
    brand: "Hot Wheels RLC",
    scale: "1:64",
    purchaseDate: new Date("2023-10-05"),
    purchasePrice: 40.00,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "Red Line Club exclusive",
  },
  {
    id: "10",
    itemName: "Audi R8",
    category: "Matchbox",
    brand: "Matchbox Collectors",
    scale: "1:64",
    purchaseDate: new Date("2024-01-25"),
    purchasePrice: 19.99,
    currency: "USD",
    condition: "New",
    status: "Owned",
    description: "Collectors edition",
  },
]

export function CollectionGrid() {
  // Column definitions
  const columnDefs: ColDef<CollectionItem>[] = useMemo(
    () => [
      {
        field: "itemName",
        headerName: "Item Name",
        sortable: true,
        filter: true,
        flex: 2,
        minWidth: 200,
      },
      {
        field: "category",
        headerName: "Category",
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 120,
      },
      {
        field: "brand",
        headerName: "Brand",
        sortable: true,
        filter: true,
        flex: 1.5,
        minWidth: 150,
      },
      {
        field: "scale",
        headerName: "Scale",
        sortable: true,
        filter: true,
        width: 100,
      },
      {
        field: "purchaseDate",
        headerName: "Purchase Date",
        sortable: true,
        filter: true,
        width: 150,
        valueFormatter: (params) => {
          if (params.value) {
            return format(new Date(params.value), "MMM dd, yyyy")
          }
          return ""
        },
      },
      {
        field: "purchasePrice",
        headerName: "Price",
        sortable: true,
        filter: true,
        width: 130,
        valueFormatter: (params) => {
          if (params.data) {
            return `${params.data.currency} ${params.value.toFixed(2)}`
          }
          return ""
        },
        type: "numericColumn",
      },
      {
        field: "condition",
        headerName: "Condition",
        sortable: true,
        filter: true,
        width: 120,
      },
      {
        field: "status",
        headerName: "Status",
        sortable: true,
        filter: true,
        width: 130,
        cellRenderer: (params: any) => {
          const status = params.value
          const statusColors: Record<string, string> = {
            Owned: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            "Pre-ordered": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            "On Order": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          }
          const colorClass = statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
          return `<span class="px-2 py-1 rounded-full text-xs font-medium ${colorClass}">${status}</span>`
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

  return (
    <div className="ag-theme-quartz w-full h-[600px]">
      <AgGridReact<CollectionItem>
        theme="legacy"
        rowData={dummyCollectionData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 20, 50, 100]}
        animateRows={true}
        rowSelection="single"
        suppressRowClickSelection={false}
        domLayout="normal"
      />
    </div>
  )
}

