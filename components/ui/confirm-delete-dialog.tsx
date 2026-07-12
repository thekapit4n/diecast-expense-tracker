"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmWord?: string
  onConfirm: () => Promise<void> | void
}

/**
 * Hard-delete confirmation gated behind typing a confirm word, for
 * destructive actions that also cascade to related tables.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord = "DELETE",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [typedValue, setTypedValue] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!open) setTypedValue("")
  }, [open])

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isDeleting && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm">{description}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>
            Type <span className="font-mono font-semibold">{confirmWord}</span> to confirm
          </Label>
          <Input
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={typedValue !== confirmWord || isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? "Deleting..." : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
