"use client"

import { useEffect, useState } from "react"
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
  FormDescription,
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

const brandFormSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  type: z.string().min(1, "Category is required"),
  isactive: z.enum(["1", "0"]),
})

type BrandFormValues = z.infer<typeof brandFormSchema>

export interface BrandRecord {
  id: number
  name: string
  type: string | null
  isactive: number
}

/** The categories in use across the existing brand list. */
const TYPE_OPTIONS = ["Diecast", "Diorama", "Accessory"]

interface BrandFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand?: BrandRecord | null
  onSuccess: () => void
}

export function BrandFormModal({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: BrandFormModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { name: "", type: "Diecast", isactive: "1" },
  })

  const isEdit = !!brand

  useEffect(() => {
    if (!open) return
    form.reset(
      brand
        ? {
            name: brand.name ?? "",
            type: brand.type ?? "Diecast",
            isactive: brand.isactive === 1 ? "1" : "0",
          }
        : { name: "", type: "Diecast", isactive: "1" }
    )
  }, [open, brand, form])

  async function onSubmit(values: BrandFormValues) {
    const name = values.name.trim()
    setSaving(true)
    try {
      // Brands are matched by name elsewhere (the catalog groups by brand
      // name), and the table has no unique constraint, so guard here.
      const duplicateQuery = supabase
        .from("tbl_master_brand")
        .select("id")
        .ilike("name", name)
        .limit(1)
      const { data: duplicates, error: dupError } = isEdit
        ? await duplicateQuery.neq("id", brand!.id)
        : await duplicateQuery
      if (dupError) throw dupError
      if (duplicates && duplicates.length > 0) {
        form.setError("name", {
          message: "A brand with this name already exists",
        })
        return
      }

      const payload = {
        name,
        type: values.type,
        isactive: Number(values.isactive),
      }

      if (isEdit && brand) {
        const { error } = await supabase
          .from("tbl_master_brand")
          .update(payload)
          .eq("id", brand.id)
        if (error) throw error
        toast.success("Brand updated")
      } else {
        const { error } = await supabase
          .from("tbl_master_brand")
          .insert(payload)

        // tbl_master_brand.id only gained a sequence default in migration
        // 20260807000000. Until that has been applied, Postgres rejects the
        // insert for a null id (23502) — fall back to picking the next id by
        // hand so the screen still works on an un-migrated database.
        if (error?.code === "23502") {
          const { data: highest, error: maxError } = await supabase
            .from("tbl_master_brand")
            .select("id")
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (maxError) throw maxError

          const { error: retryError } = await supabase
            .from("tbl_master_brand")
            .insert({ ...payload, id: (highest?.id ?? 0) + 1 })
          if (retryError) throw retryError
        } else if (error) {
          throw error
        }
        toast.success("Brand added")
      }

      onSuccess()
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : "Unknown error"
      toast.error(
        `${isEdit ? "Failed to update brand" : "Failed to add brand"}: ${message}`
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Brand" : "Add Brand"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this brand's name, category or status."
              : "Add a new brand to the master list."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mini GT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isactive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="0">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Inactive brands stay linked to existing items but are meant
                    to be hidden from new entries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
