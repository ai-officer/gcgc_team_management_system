'use client'

import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  Building, 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
  MapPin,
  Hash,
  UserCheck,
  X
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-700'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-700'
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL': return '👤'
      case 'TEAM': return '👥'
      case 'COLLABORATION': return '🤝'
      default: return '📋'
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Member Profile
          </DialogTitle>
          <DialogDescription>
            Detailed information about team member and their current tasks
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchMemberProfile} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {memberProfile && (
            <div className="space-y-6">
              {/* Header Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                        <AvatarImage src={memberProfile.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-2xl">
                          {memberProfile.name
                            ? memberProfile.name.split(' ').map(n => n[0]).join('')
                            : memberProfile.email?.[0]?.toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-background",
                        memberProfile.isActive ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-foreground">
                          {memberProfile.name || 'Unnamed User'}
                        </h2>
                        <Badge variant={memberProfile.isActive ? 'default' : 'secondary'}>
                          {memberProfile.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{memberProfile.email}</span>
                        </div>
                        
                        {memberProfile.positionTitle && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span>{memberProfile.positionTitle}</span>
                          </div>
                        )}

                        {memberProfile.contactNumber && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{memberProfile.contactNumber}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {format(new Date(memberProfile.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="text-right">
                      <div className="space-y-2">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {memberProfile.assignedTasks?.length || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Active Tasks</div>
                        </div>
                        
                        {memberProfile._count?.completedTasks !== undefined && (
                          <div>
                            <div className="text-xl font-semibold text-green-600">
                              {memberProfile._count.completedTasks}
                            </div>
                            <div className="text-sm text-muted-foreground">Completed</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {memberProfile.firstName && (
                        <div>
                          <span className="font-medium text-muted-foreground">First Name:</span>
                          <div>{memberProfile.firstName}</div>
                        </div>
                      )}
                      
                      {memberProfile.lastName && (
                        <div>
                          <span className="font-medium text-muted-foreground">Last Name:</span>
                          <div>{memberProfile.lastName}</div>
                        </div>
                      )}

                      {memberProfile.middleName && (
                        <div>
                          <span className="font-medium text-muted-foreground">Middle Name:</span>
                          <div>{memberProfile.middleName}</div>
                        </div>
                      )}

                      {memberProfile.shortName && (
                        <div>
                          <span className="font-medium text-muted-foreground">Short Name:</span>
                          <div>{memberProfile.shortName}</div>
                        </div>
                      )}

                      {memberProfile.username && (
                        <div>
                          <span className="font-medium text-muted-foreground">Username:</span>
                          <div>{memberProfile.username}</div>
                        </div>
                      )}

                      <div>
                        <span className="font-medium text-muted-foreground">Role:</span>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          {memberProfile.role}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Organizational Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Organizational Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      {/* Organizational Path */}
                      {(memberProfile.division || memberProfile.department) && (
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <div className="font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Organizational Path:
                          </div>
                          <div className="text-sm break-words">
                            {[
                              memberProfile.division,
                              memberProfile.department,
                              memberProfile.section,
                              memberProfile.team
                            ].filter(Boolean).join(' → ') || 'Not specified'}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        {memberProfile.jobLevel && (
                          <div>
                            <span className="font-medium text-muted-foreground">Job Level:</span>
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {memberProfile.jobLevel}
                            </div>
                          </div>
                        )}

                        {memberProfile.hierarchyLevel && (
                          <div>
                            <span className="font-medium text-muted-foreground">Hierarchy Level:</span>
                            <div>{memberProfile.hierarchyLevel}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task Summary */}
              {memberProfile.assignedTasks && memberProfile.assignedTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Task Overview ({memberProfile.assignedTasks.length})
                    </CardTitle>
                    <CardDescription>
                      Current active tasks and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Task Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'].map((status) => {
                        const count = memberProfile.assignedTasks.filter(task => task.status === status).length
                        const statusColors = {
                          'TODO': 'text-gray-600 bg-gray-100',
                          'IN_PROGRESS': 'text-blue-600 bg-blue-100',
                          'IN_REVIEW': 'text-yellow-600 bg-yellow-100',
                          'COMPLETED': 'text-green-600 bg-green-100'
                        }
                        
                        return (
                          <div key={status} className={`p-3 rounded-lg ${statusColors[status as keyof typeof statusColors]}`}>
                            <div className="text-2xl font-bold">{count}</div>
                            <div className="text-sm">{status.replace('_', ' ')}</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Task List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {memberProfile.assignedTasks.map((task) => (
                        <div key={task.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getTaskTypeIcon(task.taskType)}</span>
                              <h4 className="font-medium text-foreground">{task.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due {format(new Date(task.dueDate), 'MMM dd')}
                                </div>
                              )}
                              
                              {task.team && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {task.team.name}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {task.progressPercentage}% complete
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Tasks Message */}
              {(!memberProfile.assignedTasks || memberProfile.assignedTasks.length === 0) && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Active Tasks</h3>
                    <p className="text-muted-foreground">
                      This team member currently has no assigned tasks.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
