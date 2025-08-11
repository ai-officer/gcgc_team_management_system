'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Users, Settings, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Team {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  members: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
      image: string | null
      role: string
    }
    role: string
  }>
  _count: {
    tasks: number
    events: number
  }
}

interface CreateTeamData {
  name: string
  description?: string
}

interface UpdateTeamData {
  name?: string
  description?: string
  isActive?: boolean
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  const [newTeam, setNewTeam] = useState<CreateTeamData>({
    name: '',
    description: ''
  })

  const fetchTeams = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/teams?${params}`)
      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [pagination.page, searchTerm])

  const handleCreateTeam = async () => {
    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewTeam({ name: '', description: '' })
        fetchTeams()
      }
    } catch (error) {
      console.error('Error creating team:', error)
    }
  }

  const handleUpdateTeam = async (teamId: string, updateData: UpdateTeamData) => {
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        fetchTeams()
        setEditingTeam(null)
      }
    } catch (error) {
      console.error('Error updating team:', error)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTeams()
      }
    } catch (error) {
      console.error('Error deleting team:', error)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage teams and their configurations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Add a new team to organize users and manage projects.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Enter team name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="Enter team description (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={!newTeam.name.trim()}>
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <Badge variant={team.isActive ? "default" : "secondary"}>
                      {team.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {team.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingTeam(team)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{team.name}"? This action cannot be undone 
                          and will remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteTeam(team.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Team Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-lg font-semibold text-blue-900">{team.members.length}</div>
                  <div className="text-xs text-blue-700">Members</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Activity className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-lg font-semibold text-green-900">{team._count.tasks}</div>
                  <div className="text-xs text-green-700">Tasks</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Settings className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-lg font-semibold text-purple-900">{team._count.events}</div>
                  <div className="text-xs text-purple-700">Events</div>
                </div>
              </div>

              {/* Team Members Preview */}
              {team.members.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Team Members</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                            {member.user.name 
                              ? member.user.name.split(' ').map(n => n[0]).join('') 
                              : member.user.email?.[0]?.toUpperCase() || '??'
                            }
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {team.members.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{team.members.length - 4} more
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    {team.members.filter(m => m.role === 'LEADER').length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {team.members.filter(m => m.role === 'LEADER').length} Leader(s)
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Creation Date */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      {editingTeam && (
        <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team: {editingTeam.name}</DialogTitle>
              <DialogDescription>
                Update team information and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Team Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={editingTeam.description || ''}
                  onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTeam(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateTeam(editingTeam.id, {
                name: editingTeam.name,
                description: editingTeam.description,
                isActive: editingTeam.isActive
              })}>
                Update Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}