"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
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

const purchaseFormSchema = z.object({
  collectionName: z.string().min(1, "Collection name is required"),
  itemNo: z.string().optional(),
  brandId: z.string().min(1, "Brand is required"),
  scale: z.string().optional(),
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
  remark: z.string().optional(),
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
  const [totalPrice, setTotalPrice] = useState<number>(0)

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      collectionName: "",
      itemNo: "",
      brandId: "",
      scale: "",
      quantity: "1",
      pricePerUnit: "",
      purchaseType: "",
      preOrderStatus: "",
      paymentStatus: "unpaid",
      paymentMethod: "",
      urlLink: "",
      isChase: "0",
      editionType: "",
      packagingType: "",
      sizeDetail: "",
      hasAcrylic: "0",
      remark: "",
    },
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

  // Watch quantity and pricePerUnit to calculate total
  const quantity = form.watch("quantity")
  const pricePerUnit = form.watch("pricePerUnit")

  useEffect(() => {
    const qty = parseInt(quantity) || 0
    const price = parseFloat(pricePerUnit) || 0
    const total = qty * price
    setTotalPrice(total)
  }, [quantity, pricePerUnit])

  const onSubmit = async (data: PurchaseFormValues) => {
    try {
      // First, create the collection
      const { data: collectionData, error: collectionError } = await supabase
        .from("tbl_collection")
        .insert({
          name: data.collectionName,
          item_no: data.itemNo || null,
          brand_id: parseInt(data.brandId),
          scale: data.scale || null,
          remark: data.remark || null,
        })
        .select()
        .single()

      if (collectionError) {
        console.error("Collection error:", collectionError)
        toast.error("Failed to create collection")
        return
      }

      // Then, create the purchase
      const { error: purchaseError } = await supabase
        .from("tbl_purchase")
        .insert({
          collection_id: collectionData.id,
          quantity: parseInt(data.quantity),
          price_per_unit: parseFloat(data.pricePerUnit),
          total_price: totalPrice,
          purchase_type: data.purchaseType || null,
          pre_order_status: data.preOrderStatus || null,
          pre_order_date: data.preOrderDate || null,
          payment_status: data.paymentStatus || null,
          payment_method: data.paymentMethod || null,
          payment_date: data.paymentDate || null,
          arrival_date: data.arrivalDate || null,
          url_link: data.urlLink || null,
          is_chase: data.isChase === "1",
          edition_type: data.editionType || null,
          packaging_type: data.packagingType || null,
          size_detail: data.sizeDetail || null,
          has_acrylic: data.hasAcrylic === "1",
          remark: data.remark || null,
        })

      if (purchaseError) {
        console.error("Purchase error:", purchaseError)
        toast.error("Failed to create purchase")
        return
      }

      toast.success("Purchase added successfully!")
      router.push("/purchase/list")
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred while saving the purchase")
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Purchase</h1>
        <p className="text-muted-foreground">
          Record a new diecast purchase
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Details</CardTitle>
          <CardDescription>
            Fill in the information about your diecast purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Collection Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Collection Information</h3>
                
                <FormField
                  control={form.control}
                  name="collectionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Nissan Skyline GT-R R34"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The name of the diecast model
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
                          <BrandCombobox
                            brands={brands}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select brand..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scale</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1:64" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Purchase Details */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Purchase Details</h3>

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

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="purchaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                                  format(field.value, "PPP")
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
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
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

              {/* Pre-Order Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Pre-Order Information (Optional)</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="preOrderStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pre-Order Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                                  format(field.value, "PPP")
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
                                format(field.value, "PPP")
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Item Specifications */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Item Specifications</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="isChase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is Chase?</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                    name="editionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edition Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="packagingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Packaging Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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

                  <FormField
                    control={form.control}
                    name="hasAcrylic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Has Acrylic?</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                        Additional size information (diorama sizing, base size, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>

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

              <div className="flex gap-4">
                <Button type="submit">Add Purchase</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
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

