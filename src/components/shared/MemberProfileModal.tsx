'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  AlertTriangle,
  Target,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  startDate?: string
  progressPercentage: number
  taskType: 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION'
  createdAt: string
  updatedAt: string
  team?: {
    id: string
    name: string
  }
}

interface MemberProfile {
  id: string
  name: string
  firstName?: string
  lastName?: string
  middleName?: string
  email: string
  image?: string
  role: string
  hierarchyLevel?: string
  contactNumber?: string
  positionTitle?: string
  username?: string
  shortName?: string
  division?: string
  department?: string
  section?: string
  team?: string
  jobLevel?: string
  isActive: boolean
  createdAt: string
  reportsToId: string | null
  assignedTasks: Task[]
  _count?: {
    assignedTasks: number
    completedTasks?: number
  }
}

interface MemberProfileModalProps {
  isOpen: boolean
  onClose: () => void
  memberId: string | null
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'LEADER': return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'ADMIN': return 'bg-red-50 text-red-700 border border-red-200'
    default: return 'bg-blue-50 text-blue-700 border border-blue-200'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'TODO': return 'bg-gray-100 text-gray-700'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
    case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-700'
    case 'COMPLETED': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'URGENT': return 'bg-red-100 text-red-700 border-red-200'
    case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'LOW': return 'bg-green-100 text-green-700 border-green-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function MemberProfileModal({ isOpen, onClose, memberId }: MemberProfileModalProps) {
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && memberId) {
      fetchMemberProfile()
    }
  }, [isOpen, memberId])

  const fetchMemberProfile = async () => {
    if (!memberId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/user/team-members/${memberId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch member profile')
      }

      const data = await response.json()
      setMemberProfile(data)
    } catch (err) {
      console.error('Error fetching member profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to load member profile: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const activeTasks = memberProfile?.assignedTasks?.filter(t => t.status !== 'COMPLETED').length ?? 0
  const completedTasks = memberProfile?.assignedTasks?.filter(t => t.status === 'COMPLETED').length ?? 0
  const inProgressTasks = memberProfile?.assignedTasks?.filter(t => t.status === 'IN_PROGRESS').length ?? 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">Member Profile</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <Button size="sm" onClick={fetchMemberProfile}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {memberProfile && (
            <>
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={memberProfile.image || undefined} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-lg">
                      {memberProfile.name
                        ? memberProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                        : memberProfile.email?.[0]?.toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                    memberProfile.isActive ? "bg-green-500" : "bg-gray-400"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 truncate">
                    {memberProfile.name || 'Unnamed User'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{memberProfile.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", getRoleBadgeClass(memberProfile.role))}>
                      {memberProfile.role}
                    </span>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      memberProfile.isActive
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    )}>
                      {memberProfile.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Info Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {memberProfile.positionTitle && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Position</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.positionTitle}</p>
                    </div>
                  )}
                  {memberProfile.department && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Department</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.department}</p>
                    </div>
                  )}
                  {memberProfile.division && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Division</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.division}</p>
                    </div>
                  )}
                  {memberProfile.team && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Team</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.team}</p>
                    </div>
                  )}
                  {memberProfile.section && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Section</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.section}</p>
                    </div>
                  )}
                  {memberProfile.jobLevel && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Job Level</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.jobLevel}</p>
                    </div>
                  )}
                  {memberProfile.contactNumber && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Contact</p>
                      <p className="text-sm text-gray-900 mt-0.5">{memberProfile.contactNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Member Since</p>
                    <p className="text-sm text-gray-900 mt-0.5">{format(new Date(memberProfile.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stats Row */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Task Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{memberProfile.assignedTasks?.length ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Assigned</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{completedTasks}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Completed</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{inProgressTasks}</p>
                    <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
                  </div>
                </div>
              </div>

              {/* Task List */}
              {memberProfile.assignedTasks && memberProfile.assignedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Active Tasks ({activeTasks})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {memberProfile.assignedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          {task.dueDate && (
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due {format(new Date(task.dueDate), 'MMM dd')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium", getStatusColor(task.status))}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!memberProfile.assignedTasks || memberProfile.assignedTasks.length === 0) && (
                <div className="text-center py-6">
                  <Target className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No assigned tasks</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
