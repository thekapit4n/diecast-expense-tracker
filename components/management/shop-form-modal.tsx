"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const shopFormSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  address: z.string().optional(),
  country: z.string().optional(),
})

type ShopFormValues = z.infer<typeof shopFormSchema>

export interface ShopRecord {
  id: string
  shop_name: string | null
  address: string | null
  country: string | null
}

const COUNTRY_OPTIONS = [
  "Malaysia",
  "Singapore",
  "Thailand",
  "Indonesia",
  "Philippines",
  "Vietnam",
  "Japan",
  "South Korea",
  "China",
  "Hong Kong",
  "Taiwan",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
]

interface ShopFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shop?: ShopRecord | null
  onSuccess: () => void
}

export function ShopFormModal({
  open,
  onOpenChange,
  shop,
  onSuccess,
}: ShopFormModalProps) {
  const supabase = createClient()
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      shopName: "",
      address: "",
      country: "",
    },
  })

  const isEdit = !!shop

  useEffect(() => {
    if (open) {
      if (shop) {
        form.reset({
          shopName: shop.shop_name ?? "",
          address: shop.address ?? "",
          country: shop.country ?? "",
        })
      } else {
        form.reset({
          shopName: "",
          address: "",
          country: "",
        })
      }
    }
  }, [open, shop, form])

  async function onSubmit(values: ShopFormValues) {
    try {
      if (isEdit && shop) {
        const { error } = await supabase
          .from("tbl_shop_information")
          .update({
            shop_name: values.shopName.trim() || null,
            address: values.address?.trim() || null,
            country: values.country?.trim() || null,
          })
          .eq("id", shop.id)
        if (error) throw error
        toast.success("Shop updated successfully")
      } else {
        const { error } = await supabase.from("tbl_shop_information").insert({
          shop_name: values.shopName.trim() || null,
          address: values.address?.trim() || null,
          country: values.country?.trim() || null,
        })
        if (error) throw error
        toast.success("Shop added successfully")
      }
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error(isEdit ? "Failed to update shop" : "Failed to add shop")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shop" : "Add Shop"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update shop information."
              : "Add a new shop to the list."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shopName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Name *</FormLabel>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEdit ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
