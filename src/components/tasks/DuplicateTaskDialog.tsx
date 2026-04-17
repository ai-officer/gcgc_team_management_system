'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface DuplicateOptions {
  description: boolean
  priority: boolean
  dueDate: boolean
  assignee: boolean
  subtasks: boolean
  recurrence: boolean
  location: boolean
  collaborators: boolean
  taskWeight: boolean
  slaHours: boolean
  reminderDays: boolean
}

const FIELD_OPTIONS: { key: keyof DuplicateOptions; label: string; description?: string }[] = [
  { key: 'description',  label: 'Description' },
  { key: 'priority',     label: 'Priority',    description: 'Copy priority level' },
  { key: 'dueDate',      label: 'Due Date',    description: 'Copy deadline date' },
  { key: 'assignee',     label: 'Assignee',    description: 'Copy assignment' },
  { key: 'subtasks',     label: 'Subtasks',    description: 'Copy all subtasks' },
  { key: 'recurrence',   label: 'Recurrence',  description: 'Copy recurring schedule' },
  { key: 'location',     label: 'Location / Meeting Link' },
  { key: 'collaborators',label: 'Collaborators' },
  { key: 'taskWeight',   label: 'Task Weight', description: 'Copy importance weight (1–5)' },
  { key: 'slaHours',     label: 'SLA Target',  description: 'Copy SLA deadline hours' },
  { key: 'reminderDays', label: 'Reminders',   description: 'Copy reminder schedule' },
]

interface DuplicateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceTask: any
  onConfirm: (filteredTask: any) => void
}

export default function DuplicateTaskDialog({ open, onOpenChange, sourceTask, onConfirm }: DuplicateTaskDialogProps) {
  const [options, setOptions] = useState<DuplicateOptions>({
    description: true,
    priority: true,
    dueDate: false,
    assignee: true,
    subtasks: true,
    recurrence: true,
    location: true,
    collaborators: true,
    taskWeight: true,
    slaHours: true,
    reminderDays: true,
  })

  const toggle = (key: keyof DuplicateOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleConfirm = () => {
    const filtered: any = {
      title: `${sourceTask.title} (Copy)`,
    }

    if (options.description && sourceTask.description) filtered.description = sourceTask.description
    if (options.priority) filtered.priority = sourceTask.priority
    if (options.dueDate && sourceTask.dueDate) filtered.dueDate = sourceTask.dueDate
    if (options.assignee && sourceTask.assignee) {
      filtered.assigneeId = sourceTask.assignee.id
      filtered.assignee = sourceTask.assignee
    }
    if (options.subtasks && sourceTask.subtasks) filtered.subtasks = sourceTask.subtasks
    if (options.recurrence) {
      if (sourceTask.isRecurring !== undefined) filtered.isRecurring = sourceTask.isRecurring
      if (sourceTask.recurringFrequency) filtered.recurringFrequency = sourceTask.recurringFrequency
      if (sourceTask.recurringInterval) filtered.recurringInterval = sourceTask.recurringInterval
      if (sourceTask.recurringDaysOfWeek) filtered.recurringDaysOfWeek = sourceTask.recurringDaysOfWeek
    }
    if (options.location) {
      if (sourceTask.location) filtered.location = sourceTask.location
      if (sourceTask.meetingLink) filtered.meetingLink = sourceTask.meetingLink
    }
    if (options.collaborators && sourceTask.collaborators) filtered.collaborators = sourceTask.collaborators
    if (options.taskWeight && sourceTask.taskWeight) filtered.taskWeight = sourceTask.taskWeight
    if (options.slaHours && sourceTask.slaHours) filtered.slaHours = sourceTask.slaHours
    if (options.reminderDays && sourceTask.reminderDays) filtered.reminderDays = sourceTask.reminderDays

    // Always preserve taskType and teamMembers
    filtered.taskType = sourceTask.taskType || 'INDIVIDUAL'
    if (sourceTask.teamMembers) filtered.teamMembers = sourceTask.teamMembers

    onConfirm(filtered)
    onOpenChange(false)
  }

  const selectedCount = Object.values(options).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Copy className="h-4 w-4 text-gray-500" />
            Duplicate Task
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Choose which fields to copy to the new task. Title is always copied.
          </DialogDescription>
        </DialogHeader>

        {sourceTask && (
          <div className="py-2 px-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 font-medium truncate">
            &ldquo;{sourceTask.title}&rdquo;
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          {FIELD_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${options[key] ? 'bg-blue-50' : ''}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${options[key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {options[key] && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={options[key]} onChange={() => toggle(key)} />
              <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
          <Button onClick={handleConfirm} className="gap-2 rounded-lg">
            <Copy className="h-4 w-4" />
            Duplicate ({selectedCount} fields)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
