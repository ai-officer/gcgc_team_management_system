'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Edit, Trash2, GripVertical, Crown, TrendingUp, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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

interface JobLevel {
  id: string
  name: string
  description?: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function JobLevelsPage() {
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])
  const [filteredJobLevels, setFilteredJobLevels] = useState<JobLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedJobLevel, setSelectedJobLevel] = useState<JobLevel | null>(null)
  const [newJobLevel, setNewJobLevel] = useState({
    name: '',
    description: '',
    isActive: true
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJobLevels()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredJobLevels(jobLevels)
    } else {
      const filtered = jobLevels.filter(jobLevel =>
        jobLevel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobLevel.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredJobLevels(filtered)
    }
  }, [jobLevels, searchTerm])

  const fetchJobLevels = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        includeInactive: 'true'
      })
      const response = await fetch(`/api/admin/job-levels?${params}`)
      if (response.ok) {
        const data = await response.json()
        const levels = data.jobLevels || []
        setJobLevels(levels)
        setFilteredJobLevels(levels)
      } else {
        setError('Failed to fetch job levels')
      }
    } catch (err) {
      setError('Error fetching job levels')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJobLevel = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/job-levels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newJobLevel),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewJobLevel({ name: '', description: '', isActive: true })
        fetchJobLevels()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create job level')
      }
    } catch (err) {
      setError('Error creating job level')
    } finally {
      setSaving(false)
    }
  }


  const handleEditJobLevel = async () => {
    if (!selectedJobLevel) return

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/job-levels/${selectedJobLevel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newJobLevel.name,
          description: newJobLevel.description,
          isActive: newJobLevel.isActive,
        }),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setSelectedJobLevel(null)
        setNewJobLevel({ name: '', description: '', isActive: true })
        fetchJobLevels()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update job level')
      }
    } catch (err) {
      setError('Error updating job level')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJobLevel = async (jobLevelId: string) => {
    try {
      const response = await fetch(`/api/admin/job-levels/${jobLevelId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchJobLevels()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete job level')
      }
    } catch (err) {
      setError('Error deleting job level')
    }
  }

  const openEditDialog = (jobLevel: JobLevel) => {
    setSelectedJobLevel(jobLevel)
    setNewJobLevel({
      name: jobLevel.name,
      description: jobLevel.description || '',
      isActive: jobLevel.isActive
    })
    setIsEditDialogOpen(true)
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) {
      return
    }

    const items = Array.from(jobLevels)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Optimistically update the UI
    setJobLevels(items)

    try {
      // Update the order on the server
      const response = await fetch('/api/admin/job-levels/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobLevels: items }),
      })

      if (response.ok) {
        const data = await response.json()
        setJobLevels(data.jobLevels)
      } else {
        // Revert on error
        fetchJobLevels()
        setError('Failed to reorder job levels')
      }
    } catch (err) {
      // Revert on error
      fetchJobLevels()
      setError('Error reordering job levels')
    }
  }

  const getHierarchyColor = (order: number) => {
    const colors = [
      'bg-red-100 text-red-800',      // RF1 - Lowest
      'bg-orange-100 text-orange-800', // RF2
      'bg-yellow-100 text-yellow-800', // RF3
      'bg-green-100 text-green-800',   // OF1
      'bg-blue-100 text-blue-800',     // OF2
      'bg-purple-100 text-purple-800', // M1
      'bg-pink-100 text-pink-800',     // M2 - Highest
    ]
    return colors[order - 1] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job levels...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Level Management</h1>
          <p className="text-gray-600 mt-1">
            Manage organizational hierarchy levels - drag and drop to reorder
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Job Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Job Level</DialogTitle>
              <DialogDescription>
                Add a new job level to the organizational hierarchy
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Job Level Name *</Label>
                <Input
                  id="name"
                  value={newJobLevel.name}
                  onChange={(e) => setNewJobLevel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., RF4, OF3, M3"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newJobLevel.description}
                  onChange={(e) => setNewJobLevel(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter job level description"
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateJobLevel} 
                disabled={!newJobLevel.name.trim() || saving}
              >
                {saving ? 'Creating...' : 'Create Job Level'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search job levels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Job Levels</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobLevels.length}</div>
            <p className="text-xs text-muted-foreground">
              Hierarchy levels defined
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hierarchy Range</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobLevels.length > 0 ? `${jobLevels[0]?.name} - ${jobLevels[jobLevels.length - 1]?.name}` : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              From lowest to highest
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Levels</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobLevels.filter(j => j.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Levels List */}
      <Card>
        <CardHeader>
          <CardTitle>Organizational Hierarchy</CardTitle>
          <CardDescription>
            Drag and drop to reorder hierarchy levels. Lower position = lower rank.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="job-levels">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {filteredJobLevels.map((jobLevel, index) => (
                    <Draggable key={jobLevel.id} draggableId={jobLevel.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center space-x-4 p-4 border rounded-lg transition-all ${
                            snapshot.isDragging
                              ? 'shadow-lg border-blue-300 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>
                          
                          <div className="flex items-center space-x-3 flex-1">
                            <Badge className={`text-xs ${getHierarchyColor(jobLevel.order)}`}>
                              #{jobLevel.order}
                            </Badge>
                            
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{jobLevel.name}</h3>
                              {jobLevel.description && (
                                <p className="text-sm text-gray-600">{jobLevel.description}</p>
                              )}
                            </div>
                            
                            <Badge variant={jobLevel.isActive ? "default" : "secondary"}>
                              {jobLevel.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(jobLevel)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Job Level</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{jobLevel.name}"? This action cannot be undone
                                    and may affect users assigned to this job level.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteJobLevel(jobLevel.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {filteredJobLevels.length === 0 && (
            <div className="text-center py-12">
              <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No job levels found</h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your organizational hierarchy levels.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Job Level
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Hierarchy Guide */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Default Hierarchy Guide</CardTitle>
          <CardDescription className="text-blue-700">
            Recommended organizational hierarchy structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Rank and File Levels</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>RF1:</strong> Entry level positions</li>
                <li>• <strong>RF2:</strong> Junior level with experience</li>
                <li>• <strong>RF3:</strong> Senior rank and file</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Management Levels</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>OF1:</strong> Junior officer/supervisor</li>
                <li>• <strong>OF2:</strong> Senior officer</li>
                <li>• <strong>M1:</strong> Manager level</li>
                <li>• <strong>M2:</strong> Senior manager (highest)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Level</DialogTitle>
            <DialogDescription>
              Update job level information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Job Level Name *</Label>
              <Input
                id="edit-name"
                value={newJobLevel.name}
                onChange={(e) => setNewJobLevel(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., RF4, OF3, M3"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newJobLevel.description}
                onChange={(e) => setNewJobLevel(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter job level description"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="edit-job-level-status">Status</Label>
                <p className="text-sm text-gray-600">
                  Set whether this job level is active or inactive
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {newJobLevel.isActive ? "Active" : "Inactive"}
                </span>
                <Switch
                  id="edit-job-level-status"
                  checked={newJobLevel.isActive}
                  onCheckedChange={(checked) => setNewJobLevel(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
            
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditJobLevel} 
              disabled={!newJobLevel.name.trim() || saving}
            >
              {saving ? 'Updating...' : 'Update Job Level'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-red-800 text-sm">{error}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setError('')}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}