"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface BulkCollectItem {
  id: string
  label: string
  totalPrice: number
}

interface BulkCollectDialogProps {
  shopName: string | null
  items: BulkCollectItem[]
  onOpenChange: (open: boolean) => void
  onConfirm: (paymentMethod: string | null) => Promise<void> | void
}

export function BulkCollectDialog({ shopName, items, onOpenChange, onConfirm }: BulkCollectDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("none")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const open = shopName !== null && items.length > 0

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(paymentMethod === "none" ? null : paymentMethod)
    } finally {
      setIsSubmitting(false)
      setPaymentMethod("none")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as collected</DialogTitle>
          <DialogDescription>
            {items.length} item{items.length > 1 ? "s" : ""} at {shopName}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-dashed">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-sm">
              <span className="truncate">{item.label}</span>
              <span className="text-muted-foreground whitespace-nowrap">RM {item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 border-t font-semibold text-sm">
            <span>Total</span>
            <span>RM {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>How did you pay for this visit?</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="qr_payment">QR Payment</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="fpx">FPX</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Applies to all {items.length} item{items.length > 1 ? "s" : ""} — each will be marked paid in full and collected today.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : `Mark ${items.length} as collected`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
