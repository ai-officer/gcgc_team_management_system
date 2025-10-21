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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  User, Users, Handshake, Clock, MessageSquare, Send, Edit, 
  Heart, ThumbsUp, Smile, Reply, Image, Paperclip, MoreHorizontal,
  AtSign
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
  imageUrl?: string
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
}

const REACTION_EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '😡']

export default function TaskViewModal({ 
  open, 
  onOpenChange, 
  task,
  onEdit 
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
  const [uploadingImage, setUploadingImage] = useState(false)

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

  useEffect(() => {
    if (open && task) {
      fetchComments()
      setNewComment('')
      setReplyingTo(null)
      setReplyText('')
    }
  }, [open, task])

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

  const handleImageUpload = async (file: File) => {
    if (!file || !task?.id) return null
    
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('taskId', task.id)
      
      const response = await fetch('/api/upload/comment-image', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.imageUrl
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
    return null
  }

  const handleAddComment = async (parentId?: string) => {
    const text = parentId ? replyText : newComment
    if (!text.trim() || !task?.id) return
    
    try {
      setSubmittingComment(true)
      
      let imageUrl = null
      if (fileInputRef.current?.files?.[0]) {
        imageUrl = await handleImageUpload(fileInputRef.current.files[0])
      }
      
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: text.trim(),
          parentId,
          imageUrl
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

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-10' : ''} space-y-3`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author.image || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-sm">
            {comment.author.name
              ? comment.author.name.split(' ').map(n => n[0]).join('')
              : comment.author.email?.[0]?.toUpperCase()
            }
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {comment.author.name || comment.author.email}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {comment.content}
            </p>
            {comment.imageUrl && (
              <img 
                src={comment.imageUrl} 
                alt="Comment attachment" 
                className="mt-2 max-w-xs rounded-lg border"
              />
            )}
          </div>
          
          {/* Reactions */}
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

  if (!task) return null

  const isTaskCreator = task.creator?.id === session?.user?.id

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
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.creator.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                      {task.creator.name
                        ? task.creator.name.split(' ').map(n => n[0]).join('')
                        : task.creator.email?.[0]?.toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-gray-600">Creator:</span>
                  <span className="font-medium">{task.creator.name || task.creator.email}</span>
                </div>
              )}

              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                      {task.assignee.name
                        ? task.assignee.name.split(' ').map(n => n[0]).join('')
                        : task.assignee.email?.[0]?.toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
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
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                            {member.user.name
                              ? member.user.name.split(' ').map(n => n[0]).join('')
                              : member.user.email?.[0]?.toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
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
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={collaborator.user.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                            {collaborator.user.name
                              ? collaborator.user.name.split(' ').map(n => n[0]).join('')
                              : collaborator.user.email?.[0]?.toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
                        <span>{collaborator.user.name || collaborator.user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Comments Section */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h4>
            </div>

            {/* Add Comment with Mentions and Image Upload */}
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
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                            {user.name
                              ? user.name.split(' ').map((n: string) => n[0]).join('')
                              : user.email?.[0]?.toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && setNewComment(prev => prev + ' [Image attached]')}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="text-gray-500"
                  >
                    <Image className="h-4 w-4 mr-1" />
                    Image
                  </Button>
                </div>
                
                <Button
                  onClick={() => handleAddComment()}
                  disabled={!newComment.trim() || submittingComment}
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