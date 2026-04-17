'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format, formatDistanceToNow } from 'date-fns'
import {
  User, Users, Handshake, Clock, MessageSquare, Send, Edit, Copy,
  Heart, ThumbsUp, Smile, Reply, Image, Paperclip, MoreHorizontal,
  AtSign, Trash2, Pencil, X, Check, FileText, Download, File,
  Plus, ListTodo, ChevronRight, CheckCircle2, Circle, AlertCircle, RefreshCw
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Progress } from '@/components/ui/progress'

interface Task {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  startDate?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  progressPercentage: number
  taskType: 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION'
  // Google Calendar fields
  location?: string
  meetingLink?: string
  allDay?: boolean
  recurrence?: string
  reminders?: any
  assignee?: {
    id: string
    name: string
    email: string
    image?: string
  }
  creator?: {
    id: string
    name: string
    email: string
    image?: string
  }
  assignedBy?: {
    id: string
    name: string
    email: string
    image?: string
  }
  teamMembers?: Array<{
    userId: string
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
    role: string
  }>
  collaborators?: Array<{
    userId: string
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
  }>
  // Subtask support
  parentId?: string
  parent?: {
    id: string
    title: string
  }
  // Recurring task support
  recurringParentId?: string | null
  // New feature fields
  memberSubmittedAt?: string | null
  leaderEvaluatedAt?: string | null
  workQuality?: string | null
  seniorWorkQuality?: string | null
  seniorEvaluatorId?: string | null
  seniorEvaluatedAt?: string | null
  taskWeight?: number | null
  slaHours?: number | null
  subtasks?: Array<{
    id: string
    title: string
    status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    progressPercentage: number
    dueDate?: string
    assignee?: {
      id: string
      name: string
      email: string
      image?: string
    }
  }>
  _count?: {
    subtasks: number
  }
  createdAt: string
  updatedAt: string
}

interface CommentReaction {
  id: string
  emoji: string
  userId: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Comment {
  id: string
  content: string
  createdAt: string
  parentId?: string
  imageUrl?: string  // Legacy support
  fileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  author: {
    id: string
    name: string
    email: string
    image?: string
  }
  reactions: CommentReaction[]
  replies: Comment[]
}

interface Dependency {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string
}

interface Deliverable {
  id: string
  name: string
  description?: string
  isCompleted: boolean
  completedAt?: string
  submittedBy?: { id: string; name: string; email: string; image?: string }
}

interface Procurement {
  id: string
  type: 'PURCHASE_REQUEST' | 'PURCHASE_ORDER'
  referenceNumber?: string
  amount?: number
  vendor?: string
  approverName?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'
  notes?: string
  createdBy: { id: string; name: string; email: string; image?: string }
  createdAt: string
}

interface TaskViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task) => void
  onDuplicate?: (task: Task) => void
  onTaskUpdate?: () => void | Promise<void>
  onSubtaskClick?: (subtaskId: string) => void
}

const REACTION_EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '😡']

// Helper functions for file handling
const isImageFile = (fileType?: string, url?: string): boolean => {
  if (fileType) {
    return fileType.startsWith('image/')
  }
  // Fallback: check URL extension for legacy imageUrl
  if (url) {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')
  }
  return false
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (fileType?: string) => {
  if (!fileType) return <File className="h-5 w-5" />
  if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />
  if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
  if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />
  if (fileType.includes('sheet') || fileType.includes('excel')) return <FileText className="h-5 w-5 text-green-500" />
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileText className="h-5 w-5 text-orange-500" />
  return <File className="h-5 w-5 text-gray-500" />
}

// Get effective file URL (supports both new fileUrl and legacy imageUrl)
const getEffectiveFileUrl = (comment: Comment): string | undefined => {
  return comment.fileUrl || comment.imageUrl
}

export default function TaskViewModal({
  open,
  onOpenChange,
  task,
  onEdit,
  onDuplicate,
  onTaskUpdate,
  onSubtaskClick
}: TaskViewModalProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [mentionUsers, setMentionUsers] = useState<any[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [pendingFile, setPendingFile] = useState<{
    file: File
    fileUrl: string
    fileName: string
    fileType: string
    fileSize: number
  } | null>(null)

  // Edit/Delete comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [editCommentFile, setEditCommentFile] = useState<{
    fileUrl: string | null
    fileName: string | null
    fileType: string | null
    fileSize: number | null
  } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  // Subtask state
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState<string>('')
  const [newSubtaskDeadline, setNewSubtaskDeadline] = useState<string>('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [localSubtasks, setLocalSubtasks] = useState<Task['subtasks']>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, email: string, image?: string}>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Progress editing state
  const [isEditingProgress, setIsEditingProgress] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)
  const [savingProgress, setSavingProgress] = useState(false)

  // Dependencies state
  const [dependencies, setDependencies] = useState<{ blockedBy: Dependency[]; blocking: Dependency[] }>({ blockedBy: [], blocking: [] })
  const [loadingDeps, setLoadingDeps] = useState(false)
  const [newDepTaskId, setNewDepTaskId] = useState('')
  const [addingDep, setAddingDep] = useState(false)
  const [depSearchQuery, setDepSearchQuery] = useState('')
  const [depSearchResults, setDepSearchResults] = useState<Dependency[]>([])

  // Deliverables state
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loadingDeliverables, setLoadingDeliverables] = useState(false)
  const [newDeliverableName, setNewDeliverableName] = useState('')
  const [addingDeliverable, setAddingDeliverable] = useState(false)
  const [showAddDeliverable, setShowAddDeliverable] = useState(false)

  // Procurement state
  const [procurements, setProcurements] = useState<Procurement[]>([])
  const [loadingProcurement, setLoadingProcurement] = useState(false)
  const [showAddProcurement, setShowAddProcurement] = useState(false)
  const [newProcurement, setNewProcurement] = useState({ type: 'PURCHASE_REQUEST' as 'PURCHASE_REQUEST' | 'PURCHASE_ORDER', referenceNumber: '', amount: '', vendor: '', approverName: '', notes: '' })
  const [addingProcurement, setAddingProcurement] = useState(false)

  // Work quality state
  const [savingQuality, setSavingQuality] = useState(false)

  // Due date override state
  const [showDueDateOverride, setShowDueDateOverride] = useState(false)
  const [newDueDate, setNewDueDate] = useState('')
  const [savingDueDate, setSavingDueDate] = useState(false)

  // Load comments when task changes
  const fetchComments = async () => {
    if (!task?.id) return
    
    try {
      setLoadingComments(true)
      const response = await fetch(`/api/tasks/${task.id}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  // Fetch users for mentions
  const fetchMentionUsers = async (query: string) => {
    if (!query.trim()) return []
    
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        return data.users || []
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    return []
  }

  // Fetch available users for subtask assignment
  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch('/api/users?limit=100&isActive=true')
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Fetch full task data including subtasks
  const fetchTaskDetails = async () => {
    if (!task?.id) return

    try {
      const response = await fetch(`/api/tasks/${task.id}`)
      if (response.ok) {
        const fullTask = await response.json()
        setLocalSubtasks(fullTask.subtasks || [])
        setLocalProgress(fullTask.progressPercentage || 0)
      }
    } catch (error) {
      console.error('Error fetching task details:', error)
    }
  }

  const fetchDependencies = async () => {
    if (!task?.id) return
    try {
      setLoadingDeps(true)
      const res = await fetch(`/api/tasks/${task.id}/dependencies`)
      if (res.ok) setDependencies(await res.json())
    } catch (e) { console.error(e) } finally { setLoadingDeps(false) }
  }

  const fetchDeliverables = async () => {
    if (!task?.id) return
    try {
      setLoadingDeliverables(true)
      const res = await fetch(`/api/tasks/${task.id}/deliverables`)
      if (res.ok) { const d = await res.json(); setDeliverables(d.deliverables || []) }
    } catch (e) { console.error(e) } finally { setLoadingDeliverables(false) }
  }

  const fetchProcurements = async () => {
    if (!task?.id) return
    try {
      setLoadingProcurement(true)
      const res = await fetch(`/api/tasks/${task.id}/procurement`)
      if (res.ok) { const d = await res.json(); setProcurements(d.procurements || []) }
    } catch (e) { console.error(e) } finally { setLoadingProcurement(false) }
  }

  const handleAddDependency = async (dependsOnId: string) => {
    if (!task?.id || !dependsOnId || addingDep) return
    try {
      setAddingDep(true)
      const res = await fetch(`/api/tasks/${task.id}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependsOnId })
      })
      if (res.ok) {
        await fetchDependencies()
        setDepSearchQuery('')
        setDepSearchResults([])
        toast({ title: 'Dependency added' })
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch (e) { console.error(e) } finally { setAddingDep(false) }
  }

  const handleRemoveDependency = async (dependsOnId: string) => {
    if (!task?.id) return
    const res = await fetch(`/api/tasks/${task.id}/dependencies?dependsOnId=${dependsOnId}`, { method: 'DELETE' })
    if (res.ok) { await fetchDependencies(); toast({ title: 'Dependency removed' }) }
  }

  const handleToggleDeliverable = async (deliverable: Deliverable) => {
    if (!task?.id) return
    const newState = !deliverable.isCompleted
    // Optimistic update
    setDeliverables(prev => prev.map(d => d.id === deliverable.id ? { ...d, isCompleted: newState } : d))
    try {
      const res = await fetch(`/api/tasks/${task.id}/deliverables/${deliverable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newState })
      })
      if (res.ok) {
        const data = await res.json()
        await fetchDeliverables()
        if (data.autoAdvanced) {
          toast({ title: 'All deliverables complete!', description: 'Task moved to In Review automatically.' })
          onTaskUpdate?.()
        }
      } else {
        setDeliverables(prev => prev.map(d => d.id === deliverable.id ? { ...d, isCompleted: !newState } : d))
      }
    } catch (e) {
      setDeliverables(prev => prev.map(d => d.id === deliverable.id ? { ...d, isCompleted: !newState } : d))
    }
  }

  const handleAddDeliverable = async () => {
    if (!task?.id || !newDeliverableName.trim()) return
    try {
      setAddingDeliverable(true)
      const res = await fetch(`/api/tasks/${task.id}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeliverableName.trim() })
      })
      if (res.ok) {
        await fetchDeliverables()
        setNewDeliverableName('')
        setShowAddDeliverable(false)
        toast({ title: 'Deliverable added' })
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch (e) { console.error(e) } finally { setAddingDeliverable(false) }
  }

  const handleDeleteDeliverable = async (id: string) => {
    if (!task?.id) return
    const res = await fetch(`/api/tasks/${task.id}/deliverables/${id}`, { method: 'DELETE' })
    if (res.ok) { await fetchDeliverables(); toast({ title: 'Deliverable removed' }) }
  }

  const handleAddProcurement = async () => {
    if (!task?.id) return
    try {
      setAddingProcurement(true)
      const body: Record<string, any> = { type: newProcurement.type }
      if (newProcurement.referenceNumber) body.referenceNumber = newProcurement.referenceNumber
      if (newProcurement.amount) body.amount = parseFloat(newProcurement.amount)
      if (newProcurement.vendor) body.vendor = newProcurement.vendor
      if (newProcurement.approverName) body.approverName = newProcurement.approverName
      if (newProcurement.notes) body.notes = newProcurement.notes
      const res = await fetch(`/api/tasks/${task.id}/procurement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        await fetchProcurements()
        setNewProcurement({ type: 'PURCHASE_REQUEST', referenceNumber: '', amount: '', vendor: '', approverName: '', notes: '' })
        setShowAddProcurement(false)
        toast({ title: 'PR/PO record created' })
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch (e) { console.error(e) } finally { setAddingProcurement(false) }
  }

  const handleUpdateProcurementStatus = async (procId: string, status: Procurement['status']) => {
    if (!task?.id) return
    const res = await fetch(`/api/tasks/${task.id}/procurement/${procId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) { await fetchProcurements(); toast({ title: 'Status updated' }) }
  }

  const handleSetWorkQuality = async (quality: string, isSenior = false) => {
    if (!task?.id) return
    try {
      setSavingQuality(true)
      const field = isSenior ? 'seniorWorkQuality' : 'workQuality'
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: quality })
      })
      if (res.ok) {
        toast({ title: isSenior ? 'Senior override saved' : 'Work quality saved' })
        onTaskUpdate?.()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch (e) { console.error(e) } finally { setSavingQuality(false) }
  }

  const searchTasksForDependency = async (q: string) => {
    if (!q.trim()) { setDepSearchResults([]); return }
    try {
      const res = await fetch(`/api/tasks?search=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setDepSearchResults((data.tasks || []).filter((t: any) => t.id !== task?.id))
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (open && task?.id) {
      fetchComments()
      fetchAvailableUsers()
      fetchTaskDetails()
      fetchDependencies()
      fetchDeliverables()
      fetchProcurements()
      setNewComment('')
      setReplyingTo(null)
      setReplyText('')
      setPendingFile(null)
      setEditingCommentId(null)
      setEditCommentFile(null)
      // Reset subtask state
      setShowAddSubtask(false)
      setNewSubtaskTitle('')
      setNewSubtaskAssigneeId('')
      setNewSubtaskDeadline('')
      // Reset progress state
      setIsEditingProgress(false)
    }
    // Use task.id as dependency to prevent re-running when task object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id])

  // Handle progress update
  const handleProgressUpdate = async () => {
    if (!task?.id) return

    try {
      setSavingProgress(true)
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercentage: localProgress })
      })

      if (response.ok) {
        setIsEditingProgress(false)
        toast({
          title: "Progress updated",
          description: `Progress set to ${localProgress}%`,
        })
        // Close the modal - the onOpenChange handler will refresh the task list
        onOpenChange(false)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update progress')
      }
    } catch (error) {
      console.error('Error updating progress:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update progress",
        variant: "destructive",
      })
    } finally {
      setSavingProgress(false)
    }
  }

  // Handle adding a subtask
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task?.id) return

    try {
      setAddingSubtask(true)
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          parentId: task.id,
          priority: task.priority, // Inherit parent priority
          taskType: 'INDIVIDUAL',
          assigneeId: newSubtaskAssigneeId || session?.user?.id, // Use selected assignee or default to current user
          dueDate: newSubtaskDeadline ? new Date(newSubtaskDeadline).toISOString() : undefined,
        })
      })

      if (response.ok) {
        const newTask = await response.json()
        // Add to local subtasks
        setLocalSubtasks(prev => [...(prev || []), {
          id: newTask.id,
          title: newTask.title,
          status: newTask.status,
          priority: newTask.priority,
          progressPercentage: newTask.progressPercentage,
          dueDate: newTask.dueDate,
          assignee: newTask.assignee,
        }])
        setNewSubtaskTitle('')
        setNewSubtaskAssigneeId('')
        setNewSubtaskDeadline('')
        setShowAddSubtask(false)
        toast({
          title: "Subtask created",
          description: "Your subtask has been added successfully.",
        })
        // Notify parent to refresh
        onTaskUpdate?.()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create subtask')
      }
    } catch (error) {
      console.error('Error creating subtask:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create subtask. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAddingSubtask(false)
    }
  }

  // Toggle subtask completion: COMPLETED (100%) <-> TODO (0%)
  const handleToggleSubtaskCompletion = async (subtask: NonNullable<Task['subtasks']>[number]) => {
    const isCompleted = subtask.status === 'COMPLETED'
    const newStatus = isCompleted ? 'TODO' : 'COMPLETED'
    const newProgress = isCompleted ? 0 : 100

    // Optimistic update
    setLocalSubtasks(prev =>
      (prev || []).map(s =>
        s.id === subtask.id ? { ...s, status: newStatus as typeof s.status, progressPercentage: newProgress } : s
      )
    )

    try {
      const response = await fetch(`/api/tasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progressPercentage: newProgress }),
      })

      if (!response.ok) {
        throw new Error('Failed to update subtask')
      }
      onTaskUpdate?.()
    } catch (error) {
      // Revert optimistic update on failure
      setLocalSubtasks(prev =>
        (prev || []).map(s =>
          s.id === subtask.id ? { ...s, status: subtask.status, progressPercentage: subtask.progressPercentage } : s
        )
      )
      toast({
        title: 'Error',
        description: 'Failed to update subtask. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Handle mentions in comment text
  const handleCommentChange = async (text: string) => {
    setNewComment(text)
    
    const atIndex = text.lastIndexOf('@')
    if (atIndex !== -1) {
      const mentionText = text.slice(atIndex + 1)
      if (mentionText.length > 0) {
        setMentionQuery(mentionText)
        const users = await fetchMentionUsers(mentionText)
        setMentionUsers(users)
        setShowMentions(true)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const handleMentionSelect = (user: any) => {
    const atIndex = newComment.lastIndexOf('@')
    const newText = newComment.slice(0, atIndex) + `@${user.name} `
    setNewComment(newText)
    setShowMentions(false)
  }

  const handleFileUpload = async (file: File): Promise<{
    fileUrl: string
    fileName: string
    fileType: string
    fileSize: number
  } | null> => {
    if (!file || !task?.id) return null

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB.",
        variant: "destructive",
      })
      return null
    }

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('taskId', task.id)

      const response = await fetch('/api/upload/comment-file', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return {
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
    return null
  }

  const handleAddComment = async (parentId?: string) => {
    const text = parentId ? replyText : newComment
    // Allow posting if there's text OR a pending file
    if ((!text.trim() && !pendingFile) || !task?.id) return

    try {
      setSubmittingComment(true)

      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.trim(),
          parentId,
          ...(pendingFile && {
            fileUrl: pendingFile.fileUrl,
            fileName: pendingFile.fileName,
            fileType: pendingFile.fileType,
            fileSize: pendingFile.fileSize,
          })
        })
      })

      if (response.ok) {
        const comment = await response.json()

        if (parentId) {
          // Add reply to existing comment
          setComments(prev => prev.map(c =>
            c.id === parentId
              ? { ...c, replies: [comment, ...c.replies] }
              : c
          ))
          setReplyText('')
          setReplyingTo(null)
        } else {
          // Add new comment
          setComments(prev => [comment, ...prev])
          setNewComment('')
          setPendingFile(null)
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        toast({
          title: "Comment posted",
          description: "Your comment has been added successfully.",
        })
      } else {
        throw new Error('Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })

      if (response.ok) {
        // Refresh comments to get updated reactions
        fetchComments()
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  // Start editing a comment
  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.content)
    // Support both new fileUrl and legacy imageUrl
    const effectiveUrl = comment.fileUrl || comment.imageUrl
    setEditCommentFile(effectiveUrl ? {
      fileUrl: effectiveUrl,
      fileName: comment.fileName || null,
      fileType: comment.fileType || null,
      fileSize: comment.fileSize || null
    } : null)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingCommentId(null)
    setEditCommentText('')
    setEditCommentFile(null)
    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
  }

  // Handle edit file upload
  const handleEditFileUpload = async (file: File) => {
    if (!file || !task?.id) return null

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB.",
        variant: "destructive",
      })
      return null
    }

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('taskId', task.id)

      const response = await fetch('/api/upload/comment-file', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setEditCommentFile({
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize
        })
        return data
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
    return null
  }

  // Save edited comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editCommentText.trim()) return

    try {
      setSavingEdit(true)
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editCommentText.trim(),
          fileUrl: editCommentFile?.fileUrl ?? null,
          fileName: editCommentFile?.fileName ?? null,
          fileType: editCommentFile?.fileType ?? null,
          fileSize: editCommentFile?.fileSize ?? null,
        })
      })

      if (response.ok) {
        const updatedComment = await response.json()

        // Update the comment in state
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return updatedComment
          }
          // Check if it's a reply
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r => r.id === commentId ? updatedComment : r)
            }
          }
          return c
        }))

        cancelEditing()
        toast({
          title: "Comment updated",
          description: "Your comment has been updated successfully.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update comment')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingEdit(false)
    }
  }

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      setDeletingCommentId(commentId)
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove the comment from state
        setComments(prev => {
          // First check if it's a top-level comment
          const filtered = prev.filter(c => c.id !== commentId)

          // Also check if it's a reply
          return filtered.map(c => ({
            ...c,
            replies: c.replies ? c.replies.filter(r => r.id !== commentId) : []
          }))
        })

        toast({
          title: "Comment deleted",
          description: "The comment has been deleted successfully.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleEdit = () => {
    if (task && onEdit) {
      onEdit(task)
      onOpenChange(false)
    }
  }

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL': return <User className="h-4 w-4" />
      case 'TEAM': return <Users className="h-4 w-4" />
      case 'COLLABORATION': return <Handshake className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50'
      case 'HIGH': return 'text-orange-600 bg-orange-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'LOW': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'text-gray-600 bg-gray-50'
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50'
      case 'IN_REVIEW': return 'text-yellow-600 bg-yellow-50'
      case 'COMPLETED': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const isTaskCreator = task?.creator?.id === session?.user?.id
  const isTaskAssignee = task?.assignee?.id === session?.user?.id
  const isTaskAssigner = task?.assignedBy?.id === session?.user?.id
  const canCompleteTask = isTaskCreator || isTaskAssigner || session?.user?.role === 'ADMIN'
  const isTaskTeamMember = task?.teamMembers?.some(tm => tm.user.id === session?.user?.id)
  const isTaskCollaborator = task?.collaborators?.some(c => c.user.id === session?.user?.id)

  // Users who can add subtasks: creator, assignee, team members, collaborators
  const canAddSubtasks = isTaskCreator || isTaskAssignee || isTaskTeamMember || isTaskCollaborator

  const renderComment = (comment: Comment, isReply = false) => {
    const isAuthor = comment.author.id === session?.user?.id
    const canDelete = isAuthor || isTaskCreator || session?.user?.role === 'ADMIN'
    const isEditing = editingCommentId === comment.id
    const isDeleting = deletingCommentId === comment.id

    return (
      <div key={comment.id} className={`${isReply ? 'ml-10' : ''} space-y-3`}>
        <div className="flex gap-3">
          <UserAvatar
            userId={comment.author.id}
            image={comment.author.image}
            name={comment.author.name}
            email={comment.author.email}
            className="h-8 w-8 flex-shrink-0"
            fallbackClassName="text-sm"
          />
          <div className="flex-1 space-y-2">
            {isEditing ? (
              /* Edit Mode UI */
              <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                <Textarea
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  className="min-h-[60px] resize-none text-sm bg-white"
                  placeholder="Edit your comment..."
                />

                {/* Edit File Section */}
                <div className="space-y-2">
                  {editCommentFile?.fileUrl && (
                    <div className="relative inline-block">
                      {isImageFile(editCommentFile.fileType || undefined, editCommentFile.fileUrl) ? (
                        <img
                          src={editCommentFile.fileUrl}
                          alt="Comment attachment"
                          className="max-w-xs rounded-lg border"
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                          {getFileIcon(editCommentFile.fileType || undefined)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {editCommentFile.fileName || 'Attached file'}
                            </p>
                            {editCommentFile.fileSize && (
                              <p className="text-xs text-gray-500">
                                {formatFileSize(editCommentFile.fileSize)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setEditCommentFile(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        title="Remove attachment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={editFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleEditFileUpload(file)
                    }}
                  />

                  {!editCommentFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="text-gray-500"
                    >
                      {uploadingFile ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-1" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Paperclip className="h-4 w-4 mr-1" />
                          Attach File
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Edit Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditing}
                    disabled={savingEdit}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(comment.id)}
                    disabled={!editCommentText.trim() || savingEdit}
                  >
                    {savingEdit ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal View Mode */
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.author.name || comment.author.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Edit/Delete Menu */}
                  {(isAuthor || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isAuthor && (
                          <DropdownMenuItem onClick={() => startEditingComment(comment)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 focus:text-red-600"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {comment.content}
                </p>
                {/* File Attachment Display - supports both new fileUrl and legacy imageUrl */}
                {(() => {
                  const effectiveUrl = getEffectiveFileUrl(comment)
                  if (!effectiveUrl) return null

                  const isImage = isImageFile(comment.fileType, effectiveUrl)

                  if (isImage) {
                    return (
                      <img
                        src={effectiveUrl}
                        alt="Comment attachment"
                        className="mt-2 max-w-xs rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(effectiveUrl, '_blank')}
                      />
                    )
                  }

                  // Non-image file display
                  return (
                    <a
                      href={effectiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-3 p-3 bg-gray-100 rounded-lg border hover:bg-gray-200 transition-colors max-w-xs"
                    >
                      {getFileIcon(comment.fileType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {comment.fileName || 'Attached file'}
                        </p>
                        {comment.fileSize && (
                          <p className="text-xs text-gray-500">
                            {formatFileSize(comment.fileSize)}
                          </p>
                        )}
                      </div>
                      <Download className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    </a>
                  )
                })()}
              </div>
            )}

            {/* Reactions - Only show when not editing */}
            {!isEditing && (
              <div className="flex items-center gap-3">
                {/* Existing reactions display */}
                <div className="flex items-center gap-1">
                  {REACTION_EMOJIS.map(emoji => {
                    const reactionCount = comment.reactions?.filter(r => r.emoji === emoji).length || 0
                    const hasReacted = comment.reactions?.some(r => r.emoji === emoji && r.userId === session?.user?.id)

                    if (reactionCount === 0 && !hasReacted) return null

                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(comment.id, emoji)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                          hasReacted
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        <span className="text-base">{emoji}</span>
                        <span className="text-xs font-semibold">{reactionCount}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Add reaction button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-auto p-2">
                    <div className="flex items-center gap-1">
                      {REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(comment.id, emoji)}
                          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-lg">{emoji}</span>
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(comment.id)}
                    className="h-6 px-2 text-xs text-gray-500"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
              </div>
            )}

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyText('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleAddComment(comment.id)}
                    disabled={!replyText.trim() || submittingComment}
                    size="sm"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Simple Header */}
        <DialogHeader className="space-y-4 pr-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                {getTaskTypeIcon(task.taskType)}
                <DialogTitle className="text-xl font-semibold truncate">
                  {task.title}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-gray-600">
                Created by {task.creator?.name || task.creator?.email || 'Unknown'} on {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                {task.assignedBy && task.assignedBy.id !== task.creator?.id && (
                  <> • Assigned by {task.assignedBy.name || task.assignedBy.email}</>
                )}
              </DialogDescription>
            </div>

            {/* Action buttons - positioned to avoid X button overlap */}
            <div className="flex items-center gap-2 shrink-0">
              {onDuplicate && (
                <Button variant="outline" size="sm" onClick={() => { onDuplicate(task); onOpenChange(false) }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              )}
              {isTaskCreator && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge variant="secondary" className={getStatusColor(task.status)}>
              {formatStatus(task.status)}
            </Badge>
            <Badge variant="outline">
              {task.taskType.replace('_', ' ')}
            </Badge>
          </div>

          {/* Progress Bar - Editable for assignees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              {isEditingProgress ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{localProgress}%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleProgressUpdate}
                    disabled={savingProgress}
                  >
                    {savingProgress ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600" />
                    ) : (
                      <Check className="h-3 w-3 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setIsEditingProgress(false)
                      setLocalProgress(task.progressPercentage)
                    }}
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{task.progressPercentage}%</span>
                  {canAddSubtasks && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setLocalProgress(task.progressPercentage)
                        setIsEditingProgress(true)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {isEditingProgress ? (
              <input
                type="range"
                min="0"
                max={canCompleteTask ? 100 : 90}
                value={localProgress}
                onChange={(e) => setLocalProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            ) : (
              <Progress value={task.progressPercentage} className="h-2" />
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Description</h4>
              <p className="text-gray-700 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Due:</span>
                <span className="font-medium">{format(new Date(task.dueDate), 'EEEE, MMM dd, yyyy')}</span>
                {(() => { const sot = new Date(); sot.setHours(0,0,0,0); return new Date(task.dueDate) < sot })() && task.status !== 'COMPLETED' && (
                  <Badge variant="destructive" className="ml-2">Overdue</Badge>
                )}
                {/* Leader can extend due date for assignees */}
                {(canCompleteTask || session?.user?.role === 'LEADER') && task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => { setShowDueDateOverride(v => !v); setNewDueDate(task.dueDate ? task.dueDate.split('T')[0] : '') }}
                    className="text-xs text-blue-500 hover:text-blue-700 underline ml-1"
                  >
                    {showDueDateOverride ? 'Cancel' : 'Extend'}
                  </button>
                )}
              </div>
              {showDueDateOverride && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="date"
                    value={newDueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="text-xs border rounded px-2 py-1 h-7"
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!newDueDate || savingDueDate}
                    onClick={async () => {
                      if (!newDueDate || !task.id) return
                      setSavingDueDate(true)
                      try {
                        const res = await fetch(`/api/tasks/${task.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ dueDate: new Date(newDueDate).toISOString() })
                        })
                        if (res.ok) {
                          toast({ title: 'Due date updated' })
                          setShowDueDateOverride(false)
                          onTaskUpdate?.()
                        } else {
                          const err = await res.json()
                          toast({ title: 'Error', description: err.error, variant: 'destructive' })
                        }
                      } catch (e) { console.error(e) } finally { setSavingDueDate(false) }
                    }}
                  >
                    {savingDueDate ? 'Saving...' : <Check className="h-3 w-3" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* SLA + Weight display */}
          {(task.slaHours || task.taskWeight) && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              {task.taskWeight && (
                <span className="flex items-center gap-1 text-amber-600">
                  {'★'.repeat(task.taskWeight)}{'☆'.repeat(5 - task.taskWeight)}
                  <span className="text-gray-500 ml-1">Weight {task.taskWeight}/5</span>
                </span>
              )}
              {task.slaHours && (() => {
                const createdMs = new Date(task.createdAt).getTime()
                const slaDeadline = new Date(createdMs + task.slaHours! * 60 * 60 * 1000)
                const breached = new Date() > slaDeadline && task.status !== 'COMPLETED'
                const slaDays = task.slaHours! >= 168 ? `${task.slaHours! / 168}w` : task.slaHours! >= 24 ? `${task.slaHours! / 24}d` : `${task.slaHours!}h`
                return (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${breached ? 'bg-red-50 text-red-700 border-red-200 font-semibold' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {breached ? '⚠ SLA Breached' : `SLA: ${slaDays}`}
                  </span>
                )
              })()}
            </div>
          )}

          {/* People Involved */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">People</h4>
            
            <div className="space-y-2">
              {/* Creator */}
              {task.creator && (
                <div className="flex items-center gap-2 text-sm">
                  <UserAvatar
                    userId={task.creator.id}
                    image={task.creator.image}
                    name={task.creator.name}
                    email={task.creator.email}
                    className="h-6 w-6"
                    fallbackClassName="text-xs"
                  />
                  <span className="text-gray-600">Creator:</span>
                  <span className="font-medium">{task.creator.name || task.creator.email}</span>
                </div>
              )}

              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <UserAvatar
                    userId={task.assignee.id}
                    image={task.assignee.image}
                    name={task.assignee.name}
                    email={task.assignee.email}
                    className="h-6 w-6"
                    fallbackClassName="text-xs"
                  />
                  <span className="text-gray-600">Assigned to:</span>
                  <span className="font-medium">{task.assignee.name || task.assignee.email}</span>
                </div>
              )}

              {/* Team Members */}
              {task.taskType === 'TEAM' && task.teamMembers && task.teamMembers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Team ({task.teamMembers.length}):</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {task.teamMembers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-2 text-sm">
                        <UserAvatar
                          userId={member.user.id}
                          image={member.user.image}
                          name={member.user.name}
                          email={member.user.email}
                          className="h-5 w-5"
                          fallbackClassName="text-xs"
                        />
                        <span>{member.user.name || member.user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaborators */}
              {task.taskType === 'COLLABORATION' && task.collaborators && task.collaborators.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Handshake className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Collaborators ({task.collaborators.length}):</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {task.collaborators.map((collaborator) => (
                      <div key={collaborator.userId} className="flex items-center gap-2 text-sm">
                        <UserAvatar
                          userId={collaborator.user.id}
                          image={collaborator.user.image}
                          name={collaborator.user.name}
                          email={collaborator.user.email}
                          className="h-5 w-5"
                          fallbackClassName="text-xs"
                        />
                        <span>{collaborator.user.name || collaborator.user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subtasks Section - Available on all tasks including subtasks */}
          {(
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Subtasks ({localSubtasks?.length || 0})
                </h4>
                {canAddSubtasks && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddSubtask(true)}
                    className="h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Subtask
                  </Button>
                )}
              </div>

              {/* Add Subtask Form */}
              {showAddSubtask && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter subtask title..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddSubtask()
                        }
                        if (e.key === 'Escape') {
                          setShowAddSubtask(false)
                          setNewSubtaskTitle('')
                          setNewSubtaskAssigneeId('')
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={newSubtaskAssigneeId}
                        onValueChange={setNewSubtaskAssigneeId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={session?.user?.id || ''}>
                            <div className="flex items-center gap-2">
                              <span>Myself</span>
                            </div>
                          </SelectItem>
                          {availableUsers
                            .filter(u => u.id !== session?.user?.id)
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <span>{user.name || user.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="date"
                        value={newSubtaskDeadline}
                        onChange={(e) => setNewSubtaskDeadline(e.target.value)}
                        placeholder="Deadline"
                        className="w-full"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim() || addingSubtask}
                    >
                      {addingSubtask ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddSubtask(false)
                        setNewSubtaskTitle('')
                        setNewSubtaskAssigneeId('')
                        setNewSubtaskDeadline('')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Subtasks List */}
              {localSubtasks && localSubtasks.length > 0 ? (
                <div className="space-y-2">
                  {localSubtasks.map((subtask) => {
                    const getSubtaskStatusIcon = () => {
                      switch (subtask.status) {
                        case 'COMPLETED':
                          return <CheckCircle2 className="h-4 w-4 text-green-500" />
                        case 'IN_PROGRESS':
                        case 'IN_REVIEW':
                          return <AlertCircle className="h-4 w-4 text-blue-500" />
                        default:
                          return <Circle className="h-4 w-4 text-gray-400" />
                      }
                    }

                    return (
                      <div
                        key={subtask.id}
                        className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${onSubtaskClick ? 'cursor-pointer' : ''}`}
                        onClick={() => onSubtaskClick?.(subtask.id)}
                      >
                        {/* Checkable status icon */}
                        <button
                          className="flex-shrink-0 focus:outline-none hover:scale-110 transition-transform"
                          title={subtask.status === 'COMPLETED' ? 'Mark as incomplete' : 'Mark as complete'}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleSubtaskCompletion(subtask)
                          }}
                        >
                          {getSubtaskStatusIcon()}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            subtask.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}>
                            {subtask.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                subtask.priority === 'URGENT' ? 'text-red-600 border-red-200' :
                                subtask.priority === 'HIGH' ? 'text-orange-600 border-orange-200' :
                                subtask.priority === 'MEDIUM' ? 'text-yellow-600 border-yellow-200' :
                                'text-green-600 border-green-200'
                              }`}
                            >
                              {subtask.priority}
                            </Badge>
                            {subtask.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due {format(new Date(subtask.dueDate), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </div>
                        {subtask.assignee && (
                          <UserAvatar
                            userId={subtask.assignee.id}
                            image={subtask.assignee.image}
                            name={subtask.assignee.name}
                            email={subtask.assignee.email}
                            className="h-6 w-6"
                            fallbackClassName="text-xs"
                          />
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                !showAddSubtask && (
                  <div className="text-center py-6 text-gray-500">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No subtasks yet</p>
                    {canAddSubtasks && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowAddSubtask(true)}
                        className="mt-1"
                      >
                        Add a subtask
                      </Button>
                    )}
                  </div>
                )
              )}

              {/* Subtask Progress */}
              {localSubtasks && localSubtasks.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Subtask Progress</span>
                    <span className="font-medium">
                      {localSubtasks.filter(s => s.status === 'COMPLETED').length} / {localSubtasks.length} completed
                    </span>
                  </div>
                  <Progress
                    value={(localSubtasks.filter(s => s.status === 'COMPLETED').length / localSubtasks.length) * 100}
                    className="h-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Parent Task Link - Show if this is a subtask */}
          {task.parent && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="h-4 w-4 rotate-180" />
                <span>Subtask of:</span>
                <span className="font-medium text-gray-900">{task.parent.title}</span>
              </div>
            </div>
          )}

          {/* Recurring Task Info */}
          {task.recurringParentId && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <RefreshCw className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Recurring task</span>
                <span className="text-blue-500">·</span>
                <span>Part of a recurring series</span>
              </div>
            </div>
          )}

          {/* Timestamps (Completion Time vs Evaluation Time) */}
          {(task.memberSubmittedAt || task.leaderEvaluatedAt) && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">Timeline</h4>
              {task.memberSubmittedAt && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  <span>Submitted for review:</span>
                  <span className="font-medium">{format(new Date(task.memberSubmittedAt), 'MMM dd, yyyy HH:mm')}</span>
                  {task.assignee && <span className="text-gray-400">by {task.assignee.name || task.assignee.email}</span>}
                </div>
              )}
              {task.leaderEvaluatedAt && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>Approved/Completed:</span>
                  <span className="font-medium">{format(new Date(task.leaderEvaluatedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          )}

          {/* Work Quality Rating */}
          {(task.status === 'IN_REVIEW' || task.status === 'COMPLETED') && (canCompleteTask || session?.user?.role === 'LEADER') && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-gray-900 text-sm">Work Quality</h4>
              {(() => {
                const qualities = [
                  { value: 'NONE', label: '0%', color: 'bg-gray-400' },
                  { value: 'POOR', label: '25%', color: 'bg-red-400' },
                  { value: 'FAIR', label: '50%', color: 'bg-yellow-400' },
                  { value: 'GOOD', label: '75%', color: 'bg-blue-400' },
                  { value: 'EXCELLENT', label: '100%', color: 'bg-green-500' },
                ]
                return (
                  <div className="space-y-3">
                    {/* Leader rating */}
                    {canCompleteTask && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Leader Rating</p>
                        <div className="flex gap-2">
                          {qualities.map(q => (
                            <button
                              key={q.value}
                              disabled={savingQuality}
                              onClick={() => handleSetWorkQuality(q.value, false)}
                              className={`w-10 h-10 rounded-full text-xs font-semibold text-white transition-all border-2 ${task.workQuality === q.value ? 'border-gray-800 scale-110' : 'border-transparent opacity-70 hover:opacity-100'} ${q.color}`}
                              title={q.value}
                            >{q.label}</button>
                          ))}
                        </div>
                        {task.workQuality && <p className="text-xs text-gray-500">Current: <span className="font-medium capitalize">{task.workQuality.toLowerCase()}</span></p>}
                      </div>
                    )}
                    {/* Senior override */}
                    {(session?.user?.role === 'ADMIN' || (session?.user?.role === 'LEADER' && !canCompleteTask)) && task.workQuality && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Senior Leader Override</p>
                        <div className="flex gap-2">
                          {qualities.map(q => (
                            <button
                              key={q.value}
                              disabled={savingQuality}
                              onClick={() => handleSetWorkQuality(q.value, true)}
                              className={`w-10 h-10 rounded-full text-xs font-semibold text-white transition-all border-2 ${task.seniorWorkQuality === q.value ? 'border-gray-800 scale-110' : 'border-transparent opacity-70 hover:opacity-100'} ${q.color}`}
                              title={q.value}
                            >{q.label}</button>
                          ))}
                        </div>
                        {task.seniorWorkQuality && <p className="text-xs text-gray-500">Override: <span className="font-medium capitalize">{task.seniorWorkQuality.toLowerCase()}</span></p>}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Dependencies Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Dependencies ({dependencies.blockedBy.length} blocking this task)
              </h4>
              {canCompleteTask && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDepSearchQuery(depSearchQuery ? '' : ' ')}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              )}
            </div>

            {/* Blocked-by warning */}
            {dependencies.blockedBy.some(d => d.status !== 'COMPLETED') && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>This task is blocked by incomplete tasks and cannot move to In Progress until they are resolved.</span>
              </div>
            )}

            {/* Search for dependency */}
            {canCompleteTask && (
              <div className="space-y-1">
                <Input
                  placeholder="Search tasks to add as dependency..."
                  value={depSearchQuery}
                  onChange={(e) => { setDepSearchQuery(e.target.value); searchTasksForDependency(e.target.value) }}
                  className="h-7 text-xs"
                />
                {depSearchResults.length > 0 && (
                  <div className="border rounded bg-white shadow-sm max-h-32 overflow-y-auto">
                    {depSearchResults.map(t => (
                      <button key={t.id} onClick={() => handleAddDependency(t.id)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between gap-2">
                        <span className="truncate">{t.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${t.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{t.status.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Blockers list */}
            {loadingDeps ? (
              <div className="flex justify-center py-2"><div className="animate-spin h-4 w-4 rounded-full border-b-2 border-gray-400" /></div>
            ) : dependencies.blockedBy.length > 0 ? (
              <div className="space-y-1">
                {dependencies.blockedBy.map(dep => (
                  <div key={dep.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                    {dep.status === 'COMPLETED' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                    <span className={`flex-1 truncate ${dep.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{dep.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${dep.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : dep.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{dep.status.replace('_', ' ')}</span>
                    {canCompleteTask && (
                      <button onClick={() => handleRemoveDependency(dep.id)} className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No blocking dependencies</p>
            )}
          </div>

          {/* Deliverables Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Deliverables ({deliverables.filter(d => d.isCompleted).length}/{deliverables.length})
              </h4>
              {(canCompleteTask || session?.user?.role === 'LEADER') && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddDeliverable(v => !v)}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              )}
            </div>

            {/* Progress bar */}
            {deliverables.length > 0 && (
              <div>
                <Progress value={deliverables.length > 0 ? (deliverables.filter(d => d.isCompleted).length / deliverables.length) * 100 : 0} className="h-1.5" />
              </div>
            )}

            {/* Add deliverable form */}
            {showAddDeliverable && (
              <div className="flex gap-2">
                <Input
                  placeholder="Deliverable name..."
                  value={newDeliverableName}
                  onChange={(e) => setNewDeliverableName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddDeliverable(); if (e.key === 'Escape') setShowAddDeliverable(false) }}
                  className="h-7 text-xs flex-1"
                  autoFocus
                />
                <Button size="sm" className="h-7" onClick={handleAddDeliverable} disabled={!newDeliverableName.trim() || addingDeliverable}>
                  {addingDeliverable ? <div className="animate-spin h-3 w-3 rounded-full border-b-2 border-white" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowAddDeliverable(false)}><X className="h-3 w-3" /></Button>
              </div>
            )}

            {loadingDeliverables ? (
              <div className="flex justify-center py-2"><div className="animate-spin h-4 w-4 rounded-full border-b-2 border-gray-400" /></div>
            ) : deliverables.length > 0 ? (
              <div className="space-y-1">
                {deliverables.map(d => (
                  <div key={d.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs group">
                    <button onClick={() => handleToggleDeliverable(d)} className="flex-shrink-0">
                      {d.isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-gray-300 hover:text-gray-500" />}
                    </button>
                    <span className={`flex-1 ${d.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{d.name}</span>
                    {d.isCompleted && d.submittedBy && <span className="text-gray-400 hidden group-hover:inline">{d.submittedBy.name || d.submittedBy.email}</span>}
                    {(canCompleteTask || session?.user?.role === 'LEADER') && (
                      <button onClick={() => handleDeleteDeliverable(d.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No deliverables defined</p>
            )}
          </div>

          {/* PR / PO Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-500" />
                Procurement ({procurements.length})
              </h4>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddProcurement(v => !v)}>
                <Plus className="h-3 w-3 mr-1" />Add PR/PO
              </Button>
            </div>

            {/* Add form */}
            {showAddProcurement && (
              <div className="p-3 bg-gray-50 rounded space-y-2 text-xs">
                <div className="flex gap-2">
                  <button onClick={() => setNewProcurement(p => ({ ...p, type: 'PURCHASE_REQUEST' }))}
                    className={`flex-1 py-1 rounded border text-center font-medium ${newProcurement.type === 'PURCHASE_REQUEST' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    Purchase Request (PR)
                  </button>
                  <button onClick={() => setNewProcurement(p => ({ ...p, type: 'PURCHASE_ORDER' }))}
                    className={`flex-1 py-1 rounded border text-center font-medium ${newProcurement.type === 'PURCHASE_ORDER' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    Purchase Order (PO)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Ref. number" value={newProcurement.referenceNumber} onChange={e => setNewProcurement(p => ({ ...p, referenceNumber: e.target.value }))} className="h-7 text-xs" />
                  <Input placeholder="Amount" type="number" value={newProcurement.amount} onChange={e => setNewProcurement(p => ({ ...p, amount: e.target.value }))} className="h-7 text-xs" />
                  <Input placeholder="Vendor" value={newProcurement.vendor} onChange={e => setNewProcurement(p => ({ ...p, vendor: e.target.value }))} className="h-7 text-xs" />
                  <Input placeholder="Approver name" value={newProcurement.approverName} onChange={e => setNewProcurement(p => ({ ...p, approverName: e.target.value }))} className="h-7 text-xs" />
                </div>
                <Input placeholder="Notes (optional)" value={newProcurement.notes} onChange={e => setNewProcurement(p => ({ ...p, notes: e.target.value }))} className="h-7 text-xs" />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddProcurement(false)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddProcurement} disabled={addingProcurement}>
                    {addingProcurement ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {loadingProcurement ? (
              <div className="flex justify-center py-2"><div className="animate-spin h-4 w-4 rounded-full border-b-2 border-gray-400" /></div>
            ) : procurements.length > 0 ? (
              <div className="space-y-2">
                {procurements.map(p => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded border text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded font-semibold ${p.type === 'PURCHASE_REQUEST' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {p.type === 'PURCHASE_REQUEST' ? 'PR' : 'PO'}
                      </span>
                      {p.referenceNumber && <span className="text-gray-500 font-mono">{p.referenceNumber}</span>}
                      <span className="flex-1" />
                      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'LEADER') && (
                        <select
                          value={p.status}
                          onChange={(e) => handleUpdateProcurementStatus(p.id, e.target.value as Procurement['status'])}
                          className={`text-xs rounded px-1.5 py-0.5 border font-medium ${p.status === 'APPROVED' || p.status === 'PROCESSED' ? 'bg-green-50 text-green-700 border-green-200' : p.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="PROCESSED">Processed</option>
                        </select>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600">
                      {p.amount && <span>Amount: <strong>₱{p.amount.toLocaleString()}</strong></span>}
                      {p.vendor && <span>Vendor: <strong>{p.vendor}</strong></span>}
                      {p.approverName && <span>Approver: <strong>{p.approverName}</strong></span>}
                    </div>
                    {p.notes && <p className="text-gray-500 italic">{p.notes}</p>}
                    <p className="text-gray-400">By {p.createdBy.name || p.createdBy.email} · {format(new Date(p.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No procurement records</p>
            )}
          </div>

          {/* Enhanced Comments Section */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h4>
            </div>

            {/* Add Comment with Mentions and File Attachments */}
            <div className="space-y-3 relative">
              <div className="relative">
                <Textarea
                  placeholder="Write a comment... Use @ to mention someone"
                  value={newComment}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  className="min-h-[80px] resize-none pr-10"
                />
                
                {/* Mention Dropdown */}
                {showMentions && mentionUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    {mentionUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleMentionSelect(user)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <UserAvatar
                          userId={user.id}
                          image={user.image}
                          name={user.name}
                          email={user.email}
                          className="h-6 w-6"
                          fallbackClassName="text-xs"
                        />
                        <div>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Pending File Preview */}
              {pendingFile && (
                <div className="relative inline-block">
                  {isImageFile(pendingFile.fileType) ? (
                    <img
                      src={pendingFile.fileUrl}
                      alt="Pending attachment"
                      className="max-w-xs rounded-lg border"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                      {getFileIcon(pendingFile.fileType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pendingFile.fileName}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(pendingFile.fileSize)}</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setPendingFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const uploadedFile = await handleFileUpload(file)
                        if (uploadedFile) {
                          setPendingFile({ file, ...uploadedFile })
                        }
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || !!pendingFile}
                    className="text-gray-500"
                  >
                    {uploadingFile ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-1" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-4 w-4 mr-1" />
                        Attach
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  onClick={() => handleAddComment()}
                  disabled={(!newComment.trim() && !pendingFile) || submittingComment}
                  size="sm"
                >
                  {submittingComment ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Comments List with Reactions and Replies */}
            <div className="space-y-6 max-h-[400px] overflow-y-auto">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => renderComment(comment))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}