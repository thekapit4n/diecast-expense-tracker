"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn, formatDateForDatabase } from "@/lib/utils"
import { LOVSelector, LOVItem } from "@/components/ui/lov-selector"
import { ShopCombobox } from "@/components/ui/shop-combobox"
import { resolveOrCreateShop } from "@/lib/shop/resolve-or-create"
import { useUserTracking } from "@/lib/auth/use-user-tracking"

const editPurchaseSchema = z.object({
  // Collection fields
  collectionId: z.string(),
  collectionName: z.string().min(1, "Collection name is required"),
  itemNo: z.string().optional(),
  brandId: z.string().min(1, "Brand is required"),
  scale: z.string().optional(),
  
  // Purchase fields
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
  preOrderDate: z.date().optional().nullable(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.date().optional().nullable(),
  arrivalDate: z.date().optional().nullable(),
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

type EditPurchaseFormValues = z.infer<typeof editPurchaseSchema>

interface Brand {
  id: number
  name: string
  type: string
}

interface EditPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseId: string
  onSuccess: () => void
}

export function EditPurchaseModal({
  open,
  onOpenChange,
  purchaseId,
  onSuccess,
}: EditPurchaseModalProps) {
  const supabase = createClient()
  const { getUpdateFields } = useUserTracking()
  const [brands, setBrands] = useState<Brand[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isReloadingBrands, setIsReloadingBrands] = useState(false)
  const [originalPaymentStatus, setOriginalPaymentStatus] = useState<string | null>(null)
  
  // LOV states
  const [showBrandLOV, setShowBrandLOV] = useState(false)
  const [showScaleLOV, setShowScaleLOV] = useState(false)
  const [showPlatformLOV, setShowPlatformLOV] = useState(false)
  const [showPaymentMethodLOV, setShowPaymentMethodLOV] = useState(false)
  const [showCountryLOV, setShowCountryLOV] = useState(false)
  const [showPurchaseTypeLOV, setShowPurchaseTypeLOV] = useState(false)
  const [showPreOrderStatusLOV, setShowPreOrderStatusLOV] = useState(false)
  const [showPaymentStatusLOV, setShowPaymentStatusLOV] = useState(false)
  const [showEditionTypeLOV, setShowEditionTypeLOV] = useState(false)
  const [showPackagingTypeLOV, setShowPackagingTypeLOV] = useState(false)
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    preorder: true,
    additional: true,
  })

  const form = useForm<EditPurchaseFormValues>({
    resolver: zodResolver(editPurchaseSchema),
    defaultValues: {
      collectionId: "",
      collectionName: "",
      itemNo: "",
      brandId: "",
      scale: "1:64",
      quantity: "1",
      pricePerUnit: "",
      purchaseType: "",
      platform: "",
      preOrderStatus: "",
      preOrderDate: null,
      paymentStatus: "unpaid",
      paymentMethod: "",
      paymentDate: null,
      arrivalDate: null,
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
    },
  })

  // Fetch brands function
  const fetchBrands = useCallback(async () => {
    setIsReloadingBrands(true)
    try {
      const { data, error } = await supabase
        .from("tbl_master_brand")
        .select("id, name, type")
        .eq("isactive", 1)
        .order("name")

      if (error) {
        console.error("Error fetching brands:", error)
        toast.error("Failed to load brands")
      } else {
        const newBrandCount = data?.length || 0
        const oldBrandCount = brands.length
        
        setBrands(data || [])
        
        if (newBrandCount > oldBrandCount) {
          toast.success(`Loaded ${newBrandCount - oldBrandCount} new brand(s)`)
        } else if (newBrandCount === oldBrandCount) {
          toast.info("No new brands found")
        } else {
          toast.success("Brands refreshed")
        }
      }
    } catch (err) {
      console.error("Error fetching brands:", err)
      toast.error("Failed to reload brands")
    } finally {
      setIsReloadingBrands(false)
    }
  }, [supabase, brands.length])

  // Fetch brands on mount
  useEffect(() => {
    const loadInitialBrands = async () => {
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

    loadInitialBrands()
  }, [supabase])

  /**
   * Helper function to parse date string from database in local timezone
   * Prevents timezone conversion issues when reading dates
   */
  const parseDateFromDatabase = (dateString: string | null): Date | null => {
    if (!dateString) return null
    
    // Parse the date string (YYYY-MM-DD) in local timezone
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Fetch purchase data
  useEffect(() => {
    if (!open || !purchaseId) return

    const fetchPurchaseData = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("tbl_purchase")
          .select(`
            *,
            tbl_collection!inner(
              id,
              name,
              item_no,
              brand_id,
              scale
            )
          `)
          .eq("id", purchaseId)
          .single()

        if (error) throw error

        if (data) {
          // Store original payment status for comparison
          setOriginalPaymentStatus(data.payment_status)
          
          // Populate form with fetched data
          form.reset({
            collectionId: data.collection_id,
            collectionName: data.tbl_collection.name,
            itemNo: data.tbl_collection.item_no || "",
            brandId: data.tbl_collection.brand_id.toString(),
            scale: data.tbl_collection.scale || "1:64",
            quantity: data.quantity.toString(),
            pricePerUnit: data.price_per_unit.toString(),
            purchaseType: data.purchase_type || "",
            platform: data.platform || "",
            preOrderStatus: data.pre_order_status || "",
            preOrderDate: parseDateFromDatabase(data.pre_order_date),
            paymentStatus: data.payment_status || "unpaid",
            paymentMethod: data.payment_method || "",
            paymentDate: parseDateFromDatabase(data.payment_date),
            arrivalDate: parseDateFromDatabase(data.arrival_date),
            urlLink: data.url_link || "",
            isChase: data.is_chase ? "1" : "0",
            editionType: data.edition_type || "normal",
            packagingType: data.packaging_type || "normal",
            sizeDetail: data.size_detail || "",
            hasAcrylic: data.has_acrylic ? "1" : "0",
            shopName: data.shop_name || "",
            address: data.address || "",
            country: data.country || "",
            remark: data.remark || "",
          })
        }
      } catch (err) {
        console.error("Error fetching purchase:", err)
        toast.error("Failed to load purchase data")
        onOpenChange(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPurchaseData()
  }, [open, purchaseId, supabase, form, onOpenChange])

  const selectedBrandId = form.watch("brandId")
  const selectedBrand = brands.find((b) => b.id.toString() === selectedBrandId)
  const isDioramaBrand = selectedBrand?.type === "Diorama"

  const quantity = parseInt(form.watch("quantity")) || 0
  const pricePerUnit = parseFloat(form.watch("pricePerUnit")) || 0
  const totalPrice = quantity * pricePerUnit

  const toggleSection = (section: "preorder" | "additional") => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }


  const onSubmit = async (data: EditPurchaseFormValues) => {
    setIsSubmitting(true)
    try {
      const updateFields = getUpdateFields()

      // 1. Update collection if fields changed
      const { error: collectionError } = await supabase
        .from("tbl_collection")
        .update({
          name: data.collectionName,
          item_no: data.itemNo || null,
          brand_id: parseInt(data.brandId),
          scale: data.scale || null,
          ...updateFields,
        })
        .eq("id", data.collectionId)

      if (collectionError) {
        console.error("Collection update error:", collectionError)
        toast.error("Failed to update collection")
        return
      }

      // 2. Resolve or create shop and update purchase
      const totalPriceCalculated = parseInt(data.quantity) * parseFloat(data.pricePerUnit)
      const { shopId } = await resolveOrCreateShop(supabase, {
        shopName: data.shopName,
        address: data.address,
        country: data.country,
      })

      const { error: purchaseError } = await supabase
        .from("tbl_purchase")
        .update({
          quantity: parseInt(data.quantity),
          price_per_unit: parseFloat(data.pricePerUnit),
          total_price: totalPriceCalculated,
          purchase_type: data.purchaseType || null,
          platform: data.platform || null,
          pre_order_status: data.preOrderStatus || null,
          pre_order_date: formatDateForDatabase(data.preOrderDate),
          payment_status: data.paymentStatus || null,
          payment_method: data.paymentMethod || null,
          payment_date: formatDateForDatabase(data.paymentDate),
          arrival_date: formatDateForDatabase(data.arrivalDate),
          url_link: data.urlLink || null,
          is_chase: data.isChase === "1",
          edition_type: data.editionType || null,
          packaging_type: data.packagingType || null,
          size_detail: data.sizeDetail || null,
          has_acrylic: data.hasAcrylic === "1",
          shop_id: shopId,
          shop_name: data.shopName || null,
          address: data.address || null,
          country: data.country || null,
          remark: data.remark || null,
          ...updateFields,
        })
        .eq("id", purchaseId)

      if (purchaseError) {
        console.error("Purchase update error:", purchaseError)
        toast.error("Failed to update purchase")
        return
      }

      // 3. Sync tbl_collection_detail based on payment status
      const currentPaymentStatus = data.paymentStatus
      const wasOriginallyPaid = originalPaymentStatus === "paid"
      const isNowPaid = currentPaymentStatus === "paid"

      if (isNowPaid && !wasOriginallyPaid) {
        // Status changed TO paid - create collection detail
        const { error: detailError } = await supabase
          .from("tbl_collection_detail")
          .insert({
            collection_id: data.collectionId,
            purchase_id: purchaseId,
            quantity: parseInt(data.quantity),
            brand_id: parseInt(data.brandId),
            is_chase: data.isChase === "1",
            edition_type: data.editionType || null,
            packaging_type: data.packagingType || null,
            size_detail: data.sizeDetail || null,
            has_acrylic: data.hasAcrylic === "1",
            is_case: false,
            remark: data.remark || null,
            ...updateFields,
          })

        if (detailError) {
          console.error("Collection detail insert error:", detailError)
          // Don't fail the whole operation, just warn
          toast.warning("Purchase updated but collection detail sync had an issue")
        }
      } else if (!isNowPaid && wasOriginallyPaid) {
        // Status changed FROM paid - delete collection detail
        const { error: detailError } = await supabase
          .from("tbl_collection_detail")
          .delete()
          .eq("purchase_id", purchaseId)

        if (detailError) {
          console.error("Collection detail delete error:", detailError)
          toast.warning("Purchase updated but collection detail sync had an issue")
        }
      } else if (isNowPaid && wasOriginallyPaid) {
        // Status remains paid - update collection detail
        const { error: detailError } = await supabase
          .from("tbl_collection_detail")
          .update({
            quantity: parseInt(data.quantity),
            brand_id: parseInt(data.brandId),
            is_chase: data.isChase === "1",
            edition_type: data.editionType || null,
            packaging_type: data.packagingType || null,
            size_detail: data.sizeDetail || null,
            has_acrylic: data.hasAcrylic === "1",
            remark: data.remark || null,
            ...updateFields,
          })
          .eq("purchase_id", purchaseId)

        if (detailError) {
          console.error("Collection detail update error:", detailError)
          toast.warning("Purchase updated but collection detail sync had an issue")
        }
      }

      toast.success("Purchase updated successfully!")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating purchase:", error)
      toast.error("An error occurred while updating the purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  // LOV Data
  const brandLOVItems: LOVItem[] = brands.map((brand) => ({
    id: brand.id.toString(),
    label: brand.name,
    sublabel: brand.type,
    meta: { type: brand.type },
  }))

  const platformLOVItems: LOVItem[] = [
    { id: "shopee", label: "Shopee" },
    { id: "lazada", label: "Lazada" },
    { id: "carousell", label: "Carousell" },
    { id: "tiktok", label: "Tiktok" },
    { id: "facebook", label: "Facebook Marketplace" },
    { id: "instagram", label: "Instagram" },
    { id: "tokopedia", label: "Tokopedia" },
    { id: "amazon", label: "Amazon" },
    { id: "ebay", label: "eBay" },
    { id: "aliexpress", label: "AliExpress" },
    { id: "other", label: "Other" },
  ]

  const paymentMethodLOVItems: LOVItem[] = [
    { id: "cash", label: "Cash" },
    { id: "qr_payment", label: "QR Payment" },
    { id: "credit_card", label: "Credit Card" },
    { id: "fpx", label: "FPX" },
  ]

  const countryLOVItems: LOVItem[] = [
    { id: "Malaysia", label: "Malaysia" },
    { id: "Singapore", label: "Singapore" },
    { id: "Thailand", label: "Thailand" },
    { id: "Indonesia", label: "Indonesia" },
    { id: "Philippines", label: "Philippines" },
    { id: "Vietnam", label: "Vietnam" },
    { id: "Japan", label: "Japan" },
    { id: "South Korea", label: "South Korea" },
    { id: "China", label: "China" },
    { id: "Hong Kong", label: "Hong Kong" },
    { id: "Taiwan", label: "Taiwan" },
    { id: "United States", label: "United States" },
    { id: "United Kingdom", label: "United Kingdom" },
    { id: "Australia", label: "Australia" },
    { id: "Canada", label: "Canada" },
  ]

  const purchaseTypeLOVItems: LOVItem[] = [
    { id: "online", label: "Online" },
    { id: "shop", label: "Shop" },
    { id: "meetup", label: "Meetup" },
    { id: "event", label: "Event" },
  ]

  const preOrderStatusLOVItems: LOVItem[] = [
    { id: "pending", label: "Pending" },
    { id: "paid", label: "Paid" },
    { id: "cancelled", label: "Cancelled" },
  ]

  const paymentStatusLOVItems: LOVItem[] = [
    { id: "unpaid", label: "Unpaid" },
    { id: "paid", label: "Paid" },
    { id: "refunded", label: "Refunded" },
  ]

  const editionTypeLOVItems: LOVItem[] = [
    { id: "normal", label: "Normal" },
    { id: "event_car", label: "Event Car" },
    { id: "black_edition", label: "Black Edition" },
    { id: "limited_edition", label: "Limited Edition" },
  ]

  const packagingTypeLOVItems: LOVItem[] = [
    { id: "normal", label: "Normal" },
    { id: "normal_blister", label: "Normal Blister" },
    { id: "lbwk_blister", label: "LBWK Blister" },
    { id: "event_blister", label: "Event Blister" },
  ]

  const scaleLOVItems: LOVItem[] = [
    { id: "1:12", label: "1:12" },
    { id: "1:18", label: "1:18" },
    { id: "1:24", label: "1:24" },
    { id: "1:32", label: "1:32" },
    { id: "1:43", label: "1:43" },
    { id: "1:64", label: "1:64" },
    { id: "1:110", label: "1:110" },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg md:max-w-full md:w-[900px] lg:w-[1100px] xl:w-[1200px] max-h-[95vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Edit Purchase</DialogTitle>
            <DialogDescription>
              Update the purchase and collection information
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 pt-6 pb-4">
                {/* Collection Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">
                    Collection Information
                  </h3>

                  <FormField
                    control={form.control}
                    name="collectionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collection Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                            <Input placeholder="e.g., #123" {...field} />
                          </FormControl>
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
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => setShowBrandLOV(true)}
                            >
                              {selectedBrand ? (
                                <span className="truncate">
                                  {selectedBrand.name}{" "}
                                  <span className="text-muted-foreground">
                                    ({selectedBrand.type})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Select brand...
                                </span>
                              )}
                            </Button>
                          </FormControl>
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
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => setShowScaleLOV(true)}
                              >
                                {field.value || "1:64"}
                              </Button>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Purchase Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">
                    Purchase Details
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="quantity"
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
                      name="pricePerUnit"
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
                        RM {totalPrice.toFixed(2)}
                      </div>
                    </FormItem>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="purchaseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Type</FormLabel>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => setShowPurchaseTypeLOV(true)}
                            >
                              {field.value ? (
                                field.value.charAt(0).toUpperCase() +
                                field.value.slice(1)
                              ) : (
                                <span className="text-muted-foreground">
                                  Select type
                                </span>
                              )}
                            </Button>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("purchaseType") === "online" && (
                      <FormField
                        control={form.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => setShowPlatformLOV(true)}
                              >
                                {field.value ? (
                                  platformLOVItems.find((p) => p.id === field.value)
                                    ?.label
                                ) : (
                                  <span className="text-muted-foreground">
                                    Select platform
                                  </span>
                                )}
                              </Button>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => setShowPaymentMethodLOV(true)}
                            >
                              {field.value ? (
                                paymentMethodLOVItems.find(
                                  (p) => p.id === field.value
                                )?.label
                              ) : (
                                <span className="text-muted-foreground">
                                  Select payment method
                                </span>
                              )}
                            </Button>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Status</FormLabel>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => setShowPaymentStatusLOV(true)}
                            >
                              {field.value ? (
                                field.value.charAt(0).toUpperCase() +
                                field.value.slice(1)
                              ) : (
                                <span className="text-muted-foreground">
                                  Select status
                                </span>
                              )}
                            </Button>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentDate"
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
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                defaultMonth={field.value || undefined}
                                captionLayout="dropdown"
                                fromYear={2024}
                                toYear={new Date().getFullYear()}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("2024-01-01")
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
                </div>

                {/* Pre-Order Information - Collapsible */}
                <div className="space-y-4 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => toggleSection("preorder")}
                    className="flex w-full items-center justify-between text-sm font-semibold hover:text-primary"
                  >
                    <span>Pre-Order Information</span>
                    {collapsedSections.preorder ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>

                  {!collapsedSections.preorder && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="preOrderStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pre-Order Status</FormLabel>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between"
                                  onClick={() => setShowPreOrderStatusLOV(true)}
                                >
                                  {field.value ? (
                                    field.value.charAt(0).toUpperCase() +
                                    field.value.slice(1)
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Select status
                                    </span>
                                  )}
                                </Button>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preOrderDate"
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
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    defaultMonth={field.value || undefined}
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
                        name="arrivalDate"
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
                                  selected={field.value || undefined}
                                  onSelect={field.onChange}
                                  defaultMonth={field.value || undefined}
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

                {/* Item Specifications */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-semibold">Item Specifications</h4>

                  {!isDioramaBrand ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="isChase"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Is Chase?</FormLabel>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between"
                                  onClick={() =>
                                    field.onChange(field.value === "1" ? "0" : "1")
                                  }
                                >
                                  {field.value === "1" ? "Yes" : "No"}
                                </Button>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="editionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Edition Type</FormLabel>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between"
                                  onClick={() => setShowEditionTypeLOV(true)}
                                >
                                  {field.value ? (
                                    editionTypeLOVItems.find(
                                      (e) => e.id === field.value
                                    )?.label
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Select edition type
                                    </span>
                                  )}
                                </Button>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="packagingType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Packaging Type</FormLabel>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => setShowPackagingTypeLOV(true)}
                              >
                                {field.value ? (
                                  packagingTypeLOVItems.find(
                                    (p) => p.id === field.value
                                  )?.label
                                ) : (
                                  <span className="text-muted-foreground">
                                    Select packaging type
                                  </span>
                                )}
                              </Button>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="sizeDetail"
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
                          name="hasAcrylic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Has Acrylic?</FormLabel>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between"
                                  onClick={() =>
                                    field.onChange(field.value === "1" ? "0" : "1")
                                  }
                                >
                                  {field.value === "1" ? "Yes" : "No"}
                                </Button>
                              </FormControl>
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
                  <div className="space-y-2">
                    <FormLabel>Search existing shop</FormLabel>
                    <FormDescription>
                      Search or select an existing shop first. If not found, enter the details below and save—the shop will be added to the database.
                    </FormDescription>
                    <ShopCombobox
                      value={form.watch("shopName")}
                      onSelect={(shop) => {
                        if (shop) {
                          form.setValue("shopName", shop.shop_name ?? "")
                          form.setValue("address", shop.address ?? "")
                          form.setValue("country", shop.country ?? "")
                        }
                      }}
                      placeholder="Search or select shop..."
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="shopName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Toy Store Malaysia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Shop address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => setShowCountryLOV(true)}
                            >
                              {field.value || (
                                <span className="text-muted-foreground">
                                  Select country
                                </span>
                              )}
                            </Button>
                          </FormControl>
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
                    onClick={() => toggleSection("additional")}
                    className="flex w-full items-center justify-between text-sm font-semibold hover:text-primary"
                  >
                    <span>Additional Information</span>
                    {collapsedSections.additional ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>

                  {!collapsedSections.additional && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="urlLink"
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
                        name="remark"
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

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Purchase"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* LOV Dialogs */}
      <LOVSelector
        open={showBrandLOV}
        onOpenChange={setShowBrandLOV}
        title="Select Brand"
        description="Choose a brand or reload to fetch new brands from the database"
        items={brandLOVItems}
        value={form.watch("brandId")}
        onValueChange={(value) => form.setValue("brandId", value.toString())}
        searchPlaceholder="Search brands..."
        onReload={fetchBrands}
        isReloading={isReloadingBrands}
        renderItem={(item, isSelected) => (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex-1">
              <div className={cn(
                "text-sm font-semibold",
                isSelected ? "text-white dark:text-white" : "text-gray-900 dark:text-stone-200"
              )}>
                {item.label}
              </div>
              <div className={cn(
                "text-xs font-normal mt-0.5",
                isSelected ? "text-white dark:text-white" : "text-gray-500 dark:text-stone-400"
              )}>
                Brand
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                isSelected 
                  ? "bg-sky-800 text-white dark:bg-sky-800 dark:text-white" 
                  : "bg-gray-100 text-gray-700 dark:bg-stone-700 dark:text-stone-200"
              )} style={{ fontSize: '0.9em' }}>
                {item.sublabel}
              </span>
            </div>
          </div>
        )}
      />

      <LOVSelector
        open={showPlatformLOV}
        onOpenChange={setShowPlatformLOV}
        title="Select Platform"
        items={platformLOVItems}
        value={form.watch("platform")}
        onValueChange={(value) => form.setValue("platform", value.toString())}
        searchPlaceholder="Search platforms..."
      />

      <LOVSelector
        open={showPaymentMethodLOV}
        onOpenChange={setShowPaymentMethodLOV}
        title="Select Payment Method"
        items={paymentMethodLOVItems}
        value={form.watch("paymentMethod")}
        onValueChange={(value) => form.setValue("paymentMethod", value.toString())}
        searchPlaceholder="Search payment methods..."
      />

      <LOVSelector
        open={showCountryLOV}
        onOpenChange={setShowCountryLOV}
        title="Select Country"
        items={countryLOVItems}
        value={form.watch("country")}
        onValueChange={(value) => form.setValue("country", value.toString())}
        searchPlaceholder="Search countries..."
      />

      <LOVSelector
        open={showPurchaseTypeLOV}
        onOpenChange={setShowPurchaseTypeLOV}
        title="Select Purchase Type"
        items={purchaseTypeLOVItems}
        value={form.watch("purchaseType")}
        onValueChange={(value) => form.setValue("purchaseType", value.toString())}
        searchPlaceholder="Search purchase types..."
      />

      <LOVSelector
        open={showPreOrderStatusLOV}
        onOpenChange={setShowPreOrderStatusLOV}
        title="Select Pre-Order Status"
        items={preOrderStatusLOVItems}
        value={form.watch("preOrderStatus")}
        onValueChange={(value) => form.setValue("preOrderStatus", value.toString())}
        searchPlaceholder="Search statuses..."
      />

      <LOVSelector
        open={showPaymentStatusLOV}
        onOpenChange={setShowPaymentStatusLOV}
        title="Select Payment Status"
        items={paymentStatusLOVItems}
        value={form.watch("paymentStatus")}
        onValueChange={(value) => form.setValue("paymentStatus", value.toString())}
        searchPlaceholder="Search statuses..."
      />

      <LOVSelector
        open={showEditionTypeLOV}
        onOpenChange={setShowEditionTypeLOV}
        title="Select Edition Type"
        items={editionTypeLOVItems}
        value={form.watch("editionType")}
        onValueChange={(value) => form.setValue("editionType", value.toString())}
        searchPlaceholder="Search edition types..."
      />

      <LOVSelector
        open={showPackagingTypeLOV}
        onOpenChange={setShowPackagingTypeLOV}
        title="Select Packaging Type"
        items={packagingTypeLOVItems}
        value={form.watch("packagingType")}
        onValueChange={(value) => form.setValue("packagingType", value.toString())}
        searchPlaceholder="Search packaging types..."
      />

      <LOVSelector
        open={showScaleLOV}
        onOpenChange={setShowScaleLOV}
        title="Select Scale"
        items={scaleLOVItems}
        value={form.watch("scale")}
        onValueChange={(value) => form.setValue("scale", value.toString())}
        searchPlaceholder="Search scales..."
      />
    </>
  )
}
