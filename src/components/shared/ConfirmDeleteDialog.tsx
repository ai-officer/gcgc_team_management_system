'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Heading, e.g. "Delete board?" */
  title: string
  /** Warning/explanation shown above the confirmation input. */
  description?: ReactNode
  /** The exact text the user must type (typically the board/team name) to enable the action. */
  confirmationText: string
  /** Destructive button label. Default: "Delete". */
  confirmLabel?: string
  /** Disables the input/buttons and shows a spinner while the action runs. */
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

/**
 * A destructive-action confirmation dialog that requires the user to type an exact
 * string (e.g. the board's name) before the delete button is enabled. Guards against
 * accidental deletions from misclicks.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmationText,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [value, setValue] = useState('')

  // Clear the field each time the dialog opens so a previous attempt never lingers.
  useEffect(() => {
    if (open) setValue('')
  }, [open])

  const matches = value.trim() === confirmationText.trim() && confirmationText.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="confirm-delete-input" className="text-sm font-normal">
            Type{' '}
            <span className="font-semibold text-foreground break-all">{confirmationText}</span>{' '}
            to confirm
          </Label>
          <Input
            id="confirm-delete-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={confirmationText}
            autoComplete="off"
            autoFocus
            disabled={loading}
            onKeyDown={(e) => { if (e.key === 'Enter' && matches && !loading) onConfirm() }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!matches || loading} onClick={() => onConfirm()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
