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
  User, Users, Handshake, Clock, MessageSquare, Send, Edit,
  Heart, ThumbsUp, Smile, Reply, Image, Paperclip, MoreHorizontal,
  AtSign, Trash2, Pencil, X, Check, FileText, Download, File,
  Plus, ListTodo, ChevronRight, CheckCircle2, Circle, AlertCircle
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

interface TaskViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task) => void
  onTaskUpdate?: () => void
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
  onTaskUpdate
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
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [localSubtasks, setLocalSubtasks] = useState<Task['subtasks']>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, email: string, image?: string}>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

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

  useEffect(() => {
    if (open && task) {
      fetchComments()
      fetchAvailableUsers()
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
      setLocalSubtasks(task.subtasks || [])
    }
  }, [open, task])

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
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {getTaskTypeIcon(task.taskType)}
                <DialogTitle className="text-xl font-semibold">
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
            
            {/* Simple Edit Button */}
            {isTaskCreator && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
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

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{task.progressPercentage}%</span>
            </div>
            <Progress value={task.progressPercentage} className="h-2" />
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
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Due:</span>
              <span className="font-medium">{format(new Date(task.dueDate), 'EEEE, MMM dd, yyyy')}</span>
              {new Date(task.dueDate) < new Date() && (
                <Badge variant="destructive" className="ml-2">Overdue</Badge>
              )}
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

          {/* Subtasks Section - Only show for non-subtask tasks */}
          {!task.parentId && (
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
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {getSubtaskStatusIcon()}
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
                        <ChevronRight className="h-4 w-4 text-gray-400" />
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