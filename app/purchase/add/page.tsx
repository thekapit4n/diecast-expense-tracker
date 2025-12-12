"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { BrandCombobox } from "@/components/ui/brand-combobox"
import { CollectionCombobox, type CollectionOption } from "@/components/ui/collection-combobox"
import { ItemNoCombobox } from "@/components/ui/item-no-combobox"
import { useUserTracking } from "@/lib/auth/use-user-tracking"

const purchaseDetailSchema = z.object({
  quantity: z.string().refine(
    (val) => {
      const num = parseInt(val)
      return !isNaN(num) && num > 0
    },
    { message: "Quantity must be a positive number" }
  ),
  pricePerUnit: z.string().refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    },
    { message: "Price must be a positive number" }
  ),
  purchaseType: z.string().optional(),
  platform: z.string().optional(),
  preOrderStatus: z.string().optional(),
  preOrderDate: z.date().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.date().optional(),
  arrivalDate: z.date().optional(),
  urlLink: z.string().optional(),
  isChase: z.string().optional(),
  editionType: z.string().optional(),
  packagingType: z.string().optional(),
  sizeDetail: z.string().optional(),
  hasAcrylic: z.string().optional(),
  shopName: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  remark: z.string().optional(),
})

const purchaseFormSchema = z.object({
  collectionId: z.string().nullable(),
  collectionName: z.string().min(1, "Collection name is required"),
  itemNo: z.string().optional(),
  brandId: z.string().min(1, "Brand is required"),
  scale: z.string().optional(),
  purchaseDetails: z.array(purchaseDetailSchema).min(1, "At least one purchase detail is required"),
})

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

interface Brand {
  id: number
  name: string
  type: string
}

export default function AddPurchasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [brands, setBrands] = useState<Brand[]>([])
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [collectionSearchInput, setCollectionSearchInput] = useState("")
  const [itemNoSearchResults, setItemNoSearchResults] = useState<CollectionOption[]>([])
  const [itemNoSearchInput, setItemNoSearchInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<number, { preorder: boolean, additional: boolean }>>({})
  const [isCollectionSelected, setIsCollectionSelected] = useState(false)
  const { getInsertFields } = useUserTracking()

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      collectionId: null,
      collectionName: "",
      itemNo: "",
      brandId: "",
      scale: "1:64",
      purchaseDetails: [
        {
          quantity: "1",
          pricePerUnit: "",
          purchaseType: "",
          platform: "",
          preOrderStatus: "",
          paymentStatus: "unpaid",
          paymentMethod: "",
          urlLink: "",
          isChase: "0",
          editionType: "normal",
          packagingType: "normal",
          sizeDetail: "",
          hasAcrylic: "0",
          shopName: "",
          address: "",
          country: "",
          remark: "",
        }
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "purchaseDetails",
  })

  // Fetch brands from Supabase
  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from("tbl_master_brand")
        .select("id, name, type")
        .eq("isactive", 1)
        .order("name")

      if (error) {
        console.error("Error fetching brands:", error)
        toast.error("Failed to load brands")
      } else {
        setBrands(data || [])
      }
    }

    fetchBrands()
  }, [])

  // Fetch collections based on search input (name only)
  useEffect(() => {
    const fetchCollections = async () => {
      if (!collectionSearchInput || collectionSearchInput.length < 2) {
        setCollections([])
        return
      }

      const { data, error } = await supabase
        .from("tbl_collection")
        .select(`
          id,
          name,
          item_no,
          brand_id,
          scale,
          tbl_master_brand!inner(name)
        `)
        .ilike("name", `%${collectionSearchInput}%`)
        .limit(10)

      if (error) {
        console.error("Error fetching collections:", error)
      } else {
        const formattedCollections: CollectionOption[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          item_no: item.item_no,
          brand_id: item.brand_id,
          brand_name: item.tbl_master_brand.name,
          scale: item.scale,
        }))
        setCollections(formattedCollections)
      }
    }

    const timeoutId = setTimeout(() => {
      fetchCollections()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [collectionSearchInput, supabase])

  // Fetch collections based on item number search
  useEffect(() => {
    const fetchByItemNo = async () => {
      if (!itemNoSearchInput || itemNoSearchInput.length < 2) {
        setItemNoSearchResults([])
        return
      }

      const { data, error } = await supabase
        .from("tbl_collection")
        .select(`
          id,
          name,
          item_no,
          brand_id,
          scale,
          tbl_master_brand!inner(name)
        `)
        .ilike("item_no", `%${itemNoSearchInput}%`)
        .limit(10)

      if (error) {
        console.error("Error fetching by item no:", error)
      } else {
        const formattedCollections: CollectionOption[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          item_no: item.item_no,
          brand_id: item.brand_id,
          brand_name: item.tbl_master_brand.name,
          scale: item.scale,
        }))
        setItemNoSearchResults(formattedCollections)
      }
    }

    const timeoutId = setTimeout(() => {
      fetchByItemNo()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [itemNoSearchInput, supabase])

  // Handle item number selection
  const handleItemNoSelect = (collection: CollectionOption | null) => {
    if (collection) {
      setIsCollectionSelected(true)
      form.setValue("collectionId", collection.id)
      form.setValue("collectionName", collection.name)
      form.setValue("itemNo", collection.item_no || "")
      form.setValue("brandId", collection.brand_id.toString())
      form.setValue("scale", collection.scale || "1:64")
      
      // Also update the collection search input to show the selected name
      setCollectionSearchInput(collection.name)
      
      console.log("Selected collection from item no:", collection.id, collection.name)
    }
  }

  // Watch brandId to get brand type for conditional rendering
  const selectedBrandId = form.watch("brandId")
  const selectedBrand = brands.find(b => b.id.toString() === selectedBrandId)
  const isDioramaBrand = selectedBrand?.type === "Diorama"

  // Calculate total prices
  const purchaseDetailsValues = form.watch("purchaseDetails")
  const totalPrices = purchaseDetailsValues.map((detail) => {
    const qty = parseInt(detail.quantity) || 0
    const price = parseFloat(detail.pricePerUnit) || 0
    return qty * price
  })
  const grandTotal = totalPrices.reduce((sum, price) => sum + price, 0)

  // Handle collection selection
  const handleCollectionSelect = (collection: CollectionOption | null) => {
    if (collection) {
      setIsCollectionSelected(true)
      form.setValue("collectionId", collection.id)
      form.setValue("collectionName", collection.name)
      form.setValue("itemNo", collection.item_no || "")
      form.setValue("brandId", collection.brand_id.toString())
      form.setValue("scale", collection.scale || "1:64")
      console.log("Selected existing collection:", collection.id, collection.name)
    } else {
      setIsCollectionSelected(false)
      form.setValue("collectionId", null)
    }
  }

  // Clear collection ID when user modifies collection fields manually
  const handleCollectionFieldChange = (field: 'itemNo' | 'brandId' | 'scale', value: string) => {
    const currentCollectionId = form.getValues("collectionId")
    
    // If there's an existing collection selected, check if the value has changed
    if (currentCollectionId && isCollectionSelected) {
      const selectedCollection = collections.find(c => c.id === currentCollectionId)
      if (selectedCollection) {
        // Check if the new value is different from the selected collection's value
        let hasChanged = false
        if (field === 'itemNo' && value !== (selectedCollection.item_no || "")) {
          hasChanged = true
        } else if (field === 'brandId' && value !== selectedCollection.brand_id.toString()) {
          hasChanged = true
        } else if (field === 'scale' && value !== (selectedCollection.scale || "1:64")) {
          hasChanged = true
        }

        // If value changed, clear the collection ID to create a new collection
        if (hasChanged) {
          setIsCollectionSelected(false)
          form.setValue("collectionId", null)
          toast.info("Collection modified - will create as new collection")
          console.log("Collection modified, will create new")
        }
      }
    }
  }

  // Toggle collapsible section
  const toggleSection = (index: number, section: 'preorder' | 'additional') => {
    setCollapsedSections(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [section]: !prev[index]?.[section]
      }
    }))
  }

  // Check if section is collapsed (default to true/collapsed)
  const isSectionCollapsed = (index: number, section: 'preorder' | 'additional') => {
    return collapsedSections[index]?.[section] !== false // Default to collapsed (true)
  }

  // Duplicate purchase detail
  const duplicatePurchaseDetail = (index: number) => {
    const detailToDuplicate = form.getValues(`purchaseDetails.${index}`)
    append(detailToDuplicate)
    toast.success("Purchase detail duplicated")
  }

  const onSubmit = async (data: PurchaseFormValues) => {
    setIsSubmitting(true)
    try {
      let collectionId = data.collectionId
      
      console.log("Submitting with collectionId:", collectionId)
      console.log("Is collection selected:", isCollectionSelected)

      // If no existing collection selected, create new one
      if (!collectionId) {
        const { data: collectionData, error: collectionError } = await supabase
          .from("tbl_collection")
          .insert({
            name: data.collectionName,
            item_no: data.itemNo || null,
            brand_id: parseInt(data.brandId),
            scale: data.scale || null,
            remark: null,
            ...getInsertFields(),
          })
          .select()
          .single()

        if (collectionError) {
          console.error("Collection error:", collectionError)
          toast.error("Failed to create collection")
          return
        }

        collectionId = collectionData.id
      }

      // Insert all purchase details
      let successCount = 0
      for (const detail of data.purchaseDetails) {
        const totalPrice = parseInt(detail.quantity) * parseFloat(detail.pricePerUnit)

        const { data: purchaseData, error: purchaseError } = await supabase
          .from("tbl_purchase")
          .insert({
            collection_id: collectionId,
            quantity: parseInt(detail.quantity),
            price_per_unit: parseFloat(detail.pricePerUnit),
            total_price: totalPrice,
            purchase_type: detail.purchaseType || null,
            platform: detail.platform || null,
            pre_order_status: detail.preOrderStatus || null,
            pre_order_date: detail.preOrderDate || null,
            payment_status: detail.paymentStatus || null,
            payment_method: detail.paymentMethod || null,
            payment_date: detail.paymentDate || null,
            arrival_date: detail.arrivalDate || null,
            url_link: detail.urlLink || null,
            is_chase: detail.isChase === "1",
            edition_type: detail.editionType || null,
            packaging_type: detail.packagingType || null,
            size_detail: detail.sizeDetail || null,
            has_acrylic: detail.hasAcrylic === "1",
            shop_name: detail.shopName || null,
            address: detail.address || null,
            country: detail.country || null,
            remark: detail.remark || null,
            ...getInsertFields(),
          })
          .select()
          .single()

        if (purchaseError) {
          console.error("Purchase error:", purchaseError)
          toast.error(`Failed to create purchase ${successCount + 1}`)
          continue
        }

        // If payment status is paid, create collection detail entry
        if (detail.paymentStatus === "paid" && purchaseData) {
          const { error: detailError } = await supabase
            .from("tbl_collection_detail")
            .insert({
              collection_id: collectionId,
              purchase_id: purchaseData.id,
              quantity: parseInt(detail.quantity),
              brand_id: parseInt(data.brandId),
              is_chase: detail.isChase === "1",
              edition_type: detail.editionType || null,
              packaging_type: detail.packagingType || null,
              size_detail: detail.sizeDetail || null,
              has_acrylic: detail.hasAcrylic === "1",
              is_case: false,
              remark: detail.remark || null,
              ...getInsertFields(),
            })

          if (detailError) {
            console.error("Collection detail error:", detailError)
          }
        }

        successCount++
      }

      if (successCount > 0) {
        toast.success(`${successCount} purchase${successCount > 1 ? 's' : ''} added successfully!`)
        router.push("/purchase/list")
      } else {
        toast.error("Failed to create any purchases")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred while saving the purchases")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Purchase</h1>
        <p className="text-muted-foreground">
          Record one or more purchases for a diecast collection
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Details</CardTitle>
          <CardDescription>
            Fill in the information about your diecast purchase(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Collection Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Collection Information</h3>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="collectionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collection Name *</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <CollectionCombobox
                              collections={collections}
                              value={form.watch("collectionId")}
                              onValueChange={handleCollectionSelect}
                              inputValue={collectionSearchInput}
                              onInputChange={(value) => {
                                setCollectionSearchInput(value)
                                form.setValue("collectionName", value)
                                
                                // If a collection was selected and user starts typing different text, clear the selection
                                if (isCollectionSelected) {
                                  const currentCollectionId = form.getValues("collectionId")
                                  const selectedCollection = collections.find(c => c.id === currentCollectionId)
                                  if (selectedCollection && value !== selectedCollection.name) {
                                    setIsCollectionSelected(false)
                                    form.setValue("collectionId", null)
                                    console.log("User typing different name, clearing collection ID")
                                  }
                                }
                              }}
                            />
                            {collectionSearchInput && !form.watch("collectionId") && collections.length === 0 && collectionSearchInput.length >= 2 && (
                              <div className="rounded-md bg-muted p-3 text-sm">
                                <p className="text-muted-foreground">
                                  No existing collection found. Will create new collection: <span className="font-semibold text-foreground">"{collectionSearchInput}"</span>
                                </p>
                              </div>
                            )}
                            {form.watch("collectionId") && (
                              <div className="rounded-md bg-primary/10 p-3 text-sm border border-primary/20">
                                <p className="text-primary font-medium">
                                  ✓ Using existing collection: {collections.find(c => c.id === form.watch("collectionId"))?.name}
                                </p>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Search for an existing collection or type a new name to create one
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="itemNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Number</FormLabel>
                          <FormControl>
                            <ItemNoCombobox
                              collections={itemNoSearchResults}
                              value={form.watch("collectionId")}
                              onValueChange={handleItemNoSelect}
                              inputValue={itemNoSearchInput}
                              onInputChange={(value) => {
                                setItemNoSearchInput(value)
                                form.setValue("itemNo", value)
                                
                                // If a collection was selected and user starts typing different text, clear the selection
                                if (isCollectionSelected) {
                                  const currentCollectionId = form.getValues("collectionId")
                                  const selectedCollection = itemNoSearchResults.find(c => c.id === currentCollectionId)
                                  if (selectedCollection && value !== (selectedCollection.item_no || "")) {
                                    setIsCollectionSelected(false)
                                    form.setValue("collectionId", null)
                                    console.log("User typing different item no, clearing collection ID")
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Search by item number to reuse collection
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand *</FormLabel>
                          <FormControl>
                            <BrandCombobox
                              brands={brands}
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                handleCollectionFieldChange('brandId', value)
                              }}
                              placeholder="Select brand..."
                            />
                          </FormControl>
                          <FormDescription>
                            &nbsp;
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isDioramaBrand && (
                      <FormField
                        control={form.control}
                        name="scale"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scale</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value)
                                handleCollectionFieldChange('scale', value)
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1:12">1:12</SelectItem>
                                <SelectItem value="1:18">1:18</SelectItem>
                                <SelectItem value="1:24">1:24</SelectItem>
                                <SelectItem value="1:32">1:32</SelectItem>
                                <SelectItem value="1:43">1:43</SelectItem>
                                <SelectItem value="1:64">1:64</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            <FormDescription>
                            &nbsp;
                          </FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase Details Array */}
              <div className="space-y-6 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Purchase Details</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      quantity: "1",
                      pricePerUnit: "",
                      purchaseType: "",
                      platform: "",
                      preOrderStatus: "",
                      paymentStatus: "unpaid",
                      paymentMethod: "",
                      urlLink: "",
                      isChase: "0",
                      editionType: "normal",
                      packagingType: "normal",
                      sizeDetail: "",
                      hasAcrylic: "0",
                      shopName: "",
                      address: "",
                      country: "",
                      remark: "",
                    })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Purchase
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Purchase #{index + 1}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => duplicatePurchaseDetail(index)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Pricing */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.pricePerUnit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price Per Unit (RM) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormItem>
                          <FormLabel>Total Price (RM)</FormLabel>
                          <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold">
                            RM {totalPrices[index]?.toFixed(2) || "0.00"}
                          </div>
                        </FormItem>
                      </div>

                      {/* Purchase & Payment Info */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.purchaseType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchase Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="online">Online</SelectItem>
                                  <SelectItem value="shop">Shop</SelectItem>
                                  <SelectItem value="meetup">Meetup</SelectItem>
                                  <SelectItem value="event">Event</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch(`purchaseDetails.${index}.purchaseType`) === "online" && (
                          <FormField
                            control={form.control}
                            name={`purchaseDetails.${index}.platform`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Platform</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select platform" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="shopee">Shopee</SelectItem>
                                    <SelectItem value="lazada">Lazada</SelectItem>
                                    <SelectItem value="carousell">Carousell</SelectItem>
                                    <SelectItem value="tiktok">Tiktok</SelectItem>
                                    <SelectItem value="facebook">Facebook Marketplace</SelectItem>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                    <SelectItem value="tokopedia">Tokopedia</SelectItem>
                                    <SelectItem value="amazon">Amazon</SelectItem>
                                    <SelectItem value="ebay">eBay</SelectItem>
                                    <SelectItem value="aliexpress">AliExpress</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.paymentMethod`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="qr_payment">QR Payment</SelectItem>
                                  <SelectItem value="credit_card">Credit Card</SelectItem>
                                  <SelectItem value="fpx">FPX</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.paymentStatus`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unpaid">Unpaid</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.paymentDate`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Payment Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "dd-MM-yyyy")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    captionLayout="dropdown"
                                    fromYear={2024}
                                    toYear={new Date().getFullYear()}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("2024-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Pre-Order Information - Collapsible */}
                      <div className="space-y-4 border-t pt-4">
                        <button
                          type="button"
                          onClick={() => toggleSection(index, 'preorder')}
                          className="flex w-full items-center justify-between text-sm font-semibold hover:text-primary"
                        >
                          <span>Pre-Order Information</span>
                          {isSectionCollapsed(index, 'preorder') ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </button>

                        {!isSectionCollapsed(index, 'preorder') && (
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`purchaseDetails.${index}.preOrderStatus`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pre-Order Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`purchaseDetails.${index}.preOrderDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Pre-Order Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "dd-MM-yyyy")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      captionLayout="dropdown"
                                      fromYear={2024}
                                      toYear={new Date().getFullYear() + 5}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.arrivalDate`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Arrival Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "dd-MM-yyyy")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    captionLayout="dropdown"
                                    fromYear={2024}
                                    toYear={new Date().getFullYear() + 10}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                          </div>
                        )}
                      </div>

                      {/* Item Specifications - Conditional based on brand type */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="text-sm font-semibold">Item Specifications</h4>

                        {!isDioramaBrand ? (
                          <>
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`purchaseDetails.${index}.isChase`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Is Chase?</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="0">No</SelectItem>
                                        <SelectItem value="1">Yes</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`purchaseDetails.${index}.editionType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Edition Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select edition type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="event_car">Event Car</SelectItem>
                                        <SelectItem value="black_edition">Black Edition</SelectItem>
                                        <SelectItem value="limited_edition">Limited Edition</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name={`purchaseDetails.${index}.packagingType`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Packaging Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select packaging type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="normal_blister">Normal Blister</SelectItem>
                                      <SelectItem value="lbwk_blister">LBWK Blister</SelectItem>
                                      <SelectItem value="event_blister">Event Blister</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        ) : (
                          <>
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`purchaseDetails.${index}.sizeDetail`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Size Detail</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., Base size, diorama dimensions"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Diorama dimensions or base size
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`purchaseDetails.${index}.hasAcrylic`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Has Acrylic?</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="0">No</SelectItem>
                                        <SelectItem value="1">Yes</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Shop Information */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="text-sm font-semibold">Shop Information</h4>
                        <FormField
                          control={form.control}
                          name={`purchaseDetails.${index}.shopName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shop Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Toy Store Malaysia"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`purchaseDetails.${index}.address`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Shop address"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`purchaseDetails.${index}.country`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                                    <SelectItem value="Singapore">Singapore</SelectItem>
                                    <SelectItem value="Thailand">Thailand</SelectItem>
                                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                                    <SelectItem value="Philippines">Philippines</SelectItem>
                                    <SelectItem value="Vietnam">Vietnam</SelectItem>
                                    <SelectItem value="Japan">Japan</SelectItem>
                                    <SelectItem value="South Korea">South Korea</SelectItem>
                                    <SelectItem value="China">China</SelectItem>
                                    <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                                    <SelectItem value="Taiwan">Taiwan</SelectItem>
                                    <SelectItem value="United States">United States</SelectItem>
                                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                    <SelectItem value="Australia">Australia</SelectItem>
                                    <SelectItem value="Canada">Canada</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Additional Information - Collapsible */}
                      <div className="space-y-4 border-t pt-4">
                        <button
                          type="button"
                          onClick={() => toggleSection(index, 'additional')}
                          className="flex w-full items-center justify-between text-sm font-semibold hover:text-primary"
                        >
                          <span>Additional Information</span>
                          {isSectionCollapsed(index, 'additional') ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </button>

                        {!isSectionCollapsed(index, 'additional') && (
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name={`purchaseDetails.${index}.urlLink`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>URL Link</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="url"
                                      placeholder="https://example.com"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Link to the product page or reference
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`purchaseDetails.${index}.remark`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Remark</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Additional notes or comments"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Grand Total */}
                {fields.length > 1 && (
                  <div className="flex justify-end">
                    <div className="rounded-md border border-input bg-muted p-4">
                      <div className="text-sm text-muted-foreground">Grand Total</div>
                      <div className="text-2xl font-bold">RM {grandTotal.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 border-t pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding Purchases..." : `Add ${fields.length} Purchase${fields.length > 1 ? 's' : ''}`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

