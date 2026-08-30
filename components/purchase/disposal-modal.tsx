"use client"

import { useEffect, useMemo, useState } from "react"
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
import {
  DISPOSAL_HANDOVERS,
  DISPOSAL_REASONS,
  type DisposalHandover,
  type DisposalReason,
  handoverHasPaymentDelay,
  handoverHasSellingCosts,
  netProfit,
} from "@/lib/disposal"

export interface DisposalModalItem {
  purchaseId: string
  collectionId: string
  collectionName: string
  quantity: number
  pricePerUnit: number
  /** units from this purchase already recorded as gone */
  alreadyDisposed: number
}

interface DisposalModalProps {
  item: DisposalModalItem | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const num = (v: string) => parseFloat(v || "0") || 0

export function DisposalModal({ item, onOpenChange, onSuccess }: DisposalModalProps) {
  const supabase = createClient()
  const { getInsertFields } = useUserTracking()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reason, setReason] = useState<DisposalReason>("sold")
  const [handover, setHandover] = useState<DisposalHandover>("face_to_face")
  const [quantity, setQuantity] = useState("1")
  const [disposalDate, setDisposalDate] = useState<Date | undefined>(new Date())
  const [counterparty, setCounterparty] = useState("")
  const [grossAmount, setGrossAmount] = useState("")
  const [postageOut, setPostageOut] = useState("")
  const [fees, setFees] = useState("")
  const [paymentReceived, setPaymentReceived] = useState(true)
  const [remark, setRemark] = useState("")

  const remaining = item ? item.quantity - item.alreadyDisposed : 0

  useEffect(() => {
    if (!item) return
    setReason("sold")
    setHandover("face_to_face")
    setQuantity("1")
    setDisposalDate(new Date())
    setCounterparty("")
    setGrossAmount("")
    setPostageOut("")
    setFees("")
    setPaymentReceived(true)
    setRemark("")
  }, [item])

  /* Lost/damaged units never changed hands, so the handover question is
   * meaningless for them. Everything else was physically given to someone. */
  const showHandover = reason !== "lost" && reason !== "damaged"
  /* Only a sale brings money in. A gift is RM 0 by definition, and trades are
   * recorded at their cash value with the swap noted in the remark. */
  const showMoney = reason === "sold" || reason === "trade"
  const showSellingCosts = showMoney && showHandover && handoverHasSellingCosts(handover)
  const showPaymentStatus = showMoney && showHandover && handoverHasPaymentDelay(handover)

  const qty = Math.max(parseInt(quantity) || 1, 1)
  /* Asking "how many" of a single-unit purchase is noise — the answer is 1. */
  const showQuantityField = !!item && item.quantity > 1

  const profit = useMemo(() => {
    if (!item || !showMoney) return null
    return netProfit(
      {
        quantity: qty,
        reason,
        status: "active",
        paymentStatus: "received",
        grossAmount: num(grossAmount),
        postageOut: showSellingCosts ? num(postageOut) : 0,
        fees: showSellingCosts ? num(fees) : 0,
      },
      item.pricePerUnit
    )
  }, [item, showMoney, showSellingCosts, qty, reason, grossAmount, postageOut, fees])

  const handleSave = async () => {
    if (!item) return

    if (qty > remaining) {
      toast.error(
        `Only ${remaining} unit${remaining === 1 ? "" : "s"} left on this purchase to record`
      )
      return
    }

    setIsSubmitting(true)
    try {
      /* COD is the one case where the car leaves before the money arrives —
       * everything else is settled the moment it changes hands. */
      const paymentStatus = showPaymentStatus
        ? paymentReceived
          ? "received"
          : "pending"
        : "received"

      const { error } = await supabase.from("tbl_disposal").insert({
        purchase_id: item.purchaseId,
        collection_id: item.collectionId,
        quantity: qty,
        reason,
        handover: showHandover ? handover : null,
        disposal_date: formatDateForDatabase(disposalDate ?? null),
        counterparty: counterparty.trim() || null,
        gross_amount: showMoney ? num(grossAmount) : 0,
        postage_out: showSellingCosts ? num(postageOut) : 0,
        fees: showSellingCosts ? num(fees) : 0,
        payment_status: paymentStatus,
        payment_received_date:
          paymentStatus === "received" ? formatDateForDatabase(disposalDate ?? null) : null,
        status: "active",
        remark: remark.trim() || null,
        ...getInsertFields(),
      })

      if (error) throw error

      toast.success(
        reason === "gift" ? "Recorded as given away" : "Recorded as left the collection"
      )
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to record disposal:", error)
      const message = error instanceof Error ? error.message : "Failed to save"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const costOfCars = item ? item.pricePerUnit * qty : 0

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Car left the collection</DialogTitle>
          <DialogDescription>
            {item?.collectionName}
            {item && item.quantity > 1 && (
              <span className="block text-xs mt-1">
                {remaining} of {item.quantity} unit{item.quantity === 1 ? "" : "s"} still yours
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Why did it leave?</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as DisposalReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPOSAL_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showHandover && (
              <div className="space-y-2">
                <Label>How did you hand it over?</Label>
                <Select
                  value={handover}
                  onValueChange={(v) => setHandover(v as DisposalHandover)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPOSAL_HANDOVERS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Single-unit purchases skip the "how many" box entirely, so the
              date field takes the full width instead of leaving a dead column. */}
          <div className={cn("gap-4", showQuantityField ? "grid grid-cols-2" : "space-y-4")}>
            {showQuantityField && (
              <div className="space-y-2">
                <Label>How many</Label>
                <Input
                  type="number"
                  min="1"
                  max={remaining}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !disposalDate && "text-muted-foreground"
                    )}
                  >
                    {disposalDate ? format(disposalDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={disposalDate}
                    onSelect={setDisposalDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {showHandover && (
            <div className="space-y-2">
              <Label>{reason === "gift" ? "Given to" : "Buyer"}</Label>
              <Input
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder={reason === "gift" ? "e.g. Amir's son" : "Buyer name"}
              />
            </div>
          )}

          {showMoney && (
            <>
              <div className="space-y-2">
                <Label>How much you got (RM)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {showSellingCosts && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Postage you paid (RM)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={postageOut}
                      onChange={(e) => setPostageOut(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{handover === "cod" ? "COD fee (RM)" : "Platform fee (RM)"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {showPaymentStatus && (
                <div className="space-y-2">
                  <Label>Money received?</Label>
                  <Select
                    value={paymentReceived ? "received" : "pending"}
                    onValueChange={(v) => setPaymentReceived(v === "received")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Not yet — waiting for courier</SelectItem>
                      <SelectItem value="received">Yes, received</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Profit only counts once the money actually arrives.
                  </p>
                </div>
              )}

              {/* Live breakdown — the numbers people get wrong when they only
                  look at sale price minus purchase price. */}
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You got</span>
                  <span>RM {num(grossAmount).toFixed(2)}</span>
                </div>
                {showSellingCosts && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Postage you paid</span>
                      <span>− RM {num(postageOut).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {handover === "cod" ? "COD fee" : "Platform fee"}
                      </span>
                      <span>− RM {num(fees).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    You paid for the car{qty > 1 ? ` (${qty})` : ""}
                  </span>
                  <span>− RM {costOfCars.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>{(profit ?? 0) < 0 ? "Real loss" : "Real profit"}</span>
                  <span className={(profit ?? 0) < 0 ? "text-destructive" : ""}>
                    RM {(profit ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}

          {reason === "gift" && (
            <p className="text-xs text-muted-foreground">
              The car leaves your collection, but the money you spent on it stays in Total
              Spent — and a gift never shows up as a loss in the profit report.
            </p>
          )}

          <div className="space-y-2">
            <Label>Remark</Label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={reason === "trade" ? "What you got in the swap" : "Optional"}
            />
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
