"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface BulkStatusUpdateItem {
  id: string
  label: string
  totalPrice: number
}

export interface BulkStatusUpdateResult {
  paymentStatus: string
  amountPaid: string
  paymentDate: Date | undefined
  paymentMethod: string
  readyDate: Date | undefined
  pickupDeadline: Date | undefined
  collectedDate: Date | undefined
}

interface BulkStatusUpdateDialogProps {
  items: BulkStatusUpdateItem[]
  onOpenChange: (open: boolean) => void
  onConfirm: (result: BulkStatusUpdateResult) => Promise<void> | void
}

export function BulkStatusUpdateDialog({ items, onOpenChange, onConfirm }: BulkStatusUpdateDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState("paid")
  const [amountPaid, setAmountPaid] = useState("")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined)
  const [paymentMethod, setPaymentMethod] = useState("none")
  const [readyDate, setReadyDate] = useState<Date | undefined>(undefined)
  const [pickupDeadline, setPickupDeadline] = useState<Date | undefined>(undefined)
  const [collectedDate, setCollectedDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const open = items.length > 0

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm({
        paymentStatus,
        amountPaid,
        paymentDate,
        paymentMethod,
        readyDate,
        pickupDeadline,
        collectedDate,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const markReadyToday = () => {
    setReadyDate(new Date())
    if (!pickupDeadline) {
      const deadline = new Date()
      deadline.setMonth(deadline.getMonth() + 1)
      setPickupDeadline(deadline)
    }
  }

  // Same rule as the single-item modal: collecting implies payment was
  // settled unless explicitly refunded, whether set via "Today" or the
  // calendar picker directly.
  const handleCollectedDateChange = (date: Date | undefined) => {
    setCollectedDate(date)
    if (date && paymentStatus !== "paid" && paymentStatus !== "refunded") {
      setPaymentStatus("paid")
      if (!paymentDate) setPaymentDate(date)
    }
  }

  const markCollectedToday = () => handleCollectedDateChange(new Date())

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader className="min-w-0">
          <DialogTitle>Bulk update pickup status</DialogTitle>
          <DialogDescription className="min-w-0 break-words">
            {items.length} item{items.length > 1 ? "s" : ""} selected
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 w-full rounded-md border border-dashed">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 border-b last:border-b-0 text-sm"
            >
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="text-muted-foreground whitespace-nowrap">RM {item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 border-t font-semibold text-sm">
            <span>Total</span>
            <span>RM {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial (deposit paid)</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentStatus !== "unpaid" && (
              <div className="space-y-2">
                <Label>Payment date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !paymentDate && "text-muted-foreground")}
                    >
                      {paymentDate ? format(paymentDate, "dd-MM-yyyy") : <span>Defaults to today</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {paymentStatus !== "unpaid" && (
            <div className="space-y-2">
              <Label>Payment method</Label>
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
            </div>
          )}

          {paymentStatus === "partial" && (
            <div className="space-y-2">
              <Label>Amount paid per item (RM)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Applied to EACH selected item individually — not split across the total.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ready date</Label>
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={markReadyToday}>
                  Today
                </Button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full pl-3 text-left font-normal", !readyDate && "text-muted-foreground")}
                  >
                    {readyDate ? format(readyDate, "dd-MM-yyyy") : <span>Not ready yet</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={readyDate} onSelect={setReadyDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Pickup deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full pl-3 text-left font-normal", !pickupDeadline && "text-muted-foreground")}
                  >
                    {pickupDeadline ? format(pickupDeadline, "dd-MM-yyyy") : <span>Optional</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={pickupDeadline} onSelect={setPickupDeadline} initialFocus />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Informational only, not enforced.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Collected date</Label>
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={markCollectedToday}>
                Today
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full pl-3 text-left font-normal", !collectedDate && "text-muted-foreground")}
                >
                  {collectedDate ? format(collectedDate, "dd-MM-yyyy") : <span>Not collected yet</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={collectedDate} onSelect={handleCollectedDateChange} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : `Update ${items.length} item${items.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
