"use client"

import { useEffect, useState } from "react"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn, formatDateForDatabase } from "@/lib/utils"
import { useUserTracking } from "@/lib/auth/use-user-tracking"

export interface PoStatusModalItem {
  id: string
  collectionName: string
  totalPrice: number
  paymentStatus: string | null
  amountPaid: number | null
  paymentDate: string | null
  paymentMethod: string | null
  readyDate: string | null
  pickupDeadline: string | null
  collectedDate: string | null
}

interface PoStatusModalProps {
  item: PoStatusModalItem | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const parseDateFromDatabase = (dateString: string | null): Date | undefined => {
  if (!dateString) return undefined
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function PoStatusModal({ item, onOpenChange, onSuccess }: PoStatusModalProps) {
  const supabase = createClient()
  const { getUpdateFields } = useUserTracking()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState("unpaid")
  const [amountPaid, setAmountPaid] = useState("")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined)
  const [paymentMethod, setPaymentMethod] = useState("none")
  const [readyDate, setReadyDate] = useState<Date | undefined>(undefined)
  const [pickupDeadline, setPickupDeadline] = useState<Date | undefined>(undefined)
  const [collectedDate, setCollectedDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (!item) return
    setPaymentStatus(item.paymentStatus || "unpaid")
    setAmountPaid(item.amountPaid != null ? String(item.amountPaid) : "")
    setPaymentDate(parseDateFromDatabase(item.paymentDate))
    setPaymentMethod(item.paymentMethod || "none")
    setReadyDate(parseDateFromDatabase(item.readyDate))
    setPickupDeadline(parseDateFromDatabase(item.pickupDeadline))
    setCollectedDate(parseDateFromDatabase(item.collectedDate))
  }, [item])

  const handleSave = async () => {
    if (!item) return
    setIsSubmitting(true)
    try {
      const amount =
        paymentStatus === "paid"
          ? item.totalPrice
          : paymentStatus === "partial"
          ? parseFloat(amountPaid || "0") || 0
          : 0

      // If payment is now settled but no payment date was ever recorded,
      // default it to the collected date (or today) so it shows up on the
      // dashboard, which keys "this month spending" off payment_date.
      const resolvedPaymentDate =
        paymentDate ??
        (paymentStatus === "paid" || paymentStatus === "partial" ? collectedDate ?? new Date() : undefined)

      const { error } = await supabase
        .from("tbl_purchase")
        .update({
          payment_status: paymentStatus,
          amount_paid: amount,
          payment_method: paymentMethod === "none" ? null : paymentMethod,
          payment_date: formatDateForDatabase(resolvedPaymentDate ?? null),
          ready_date: formatDateForDatabase(readyDate ?? null),
          pickup_deadline: formatDateForDatabase(pickupDeadline ?? null),
          collected_date: formatDateForDatabase(collectedDate ?? null),
          ...getUpdateFields(),
        })
        .eq("id", item.id)

      if (error) throw error

      toast.success("Status updated")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update PO status:", error)
      toast.error("Failed to update status")
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

  // Collecting the item implies payment was settled, unless it was explicitly
  // refunded — applies whether the date comes from the "Today" shortcut or a
  // manual pick on the calendar, so the two paths stay consistent.
  const handleCollectedDateChange = (date: Date | undefined) => {
    setCollectedDate(date)
    if (date && paymentStatus !== "paid" && paymentStatus !== "refunded") {
      setPaymentStatus("paid")
      if (!paymentDate) setPaymentDate(date)
    }
  }

  const markCollectedToday = () => handleCollectedDateChange(new Date())

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update pickup status</DialogTitle>
          <DialogDescription>{item?.collectionName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <Label>Amount paid so far (RM)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Balance: RM {Math.max(item ? item.totalPrice - (parseFloat(amountPaid || "0") || 0) : 0, 0).toFixed(2)}
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
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
