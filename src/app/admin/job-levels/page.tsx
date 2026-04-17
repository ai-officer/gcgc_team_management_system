'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Edit, Trash2, GripVertical, Crown, TrendingUp, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
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

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchJobLevels = async () => {
    try {
      const params = new URLSearchParams({
        includeInactive: 'true'
      })
      const response = await fetch(`/api/admin/job-levels?${params}`)
      if (response.ok) {
        const data = await response.json()
        const levels = data.jobLevels || []
        setJobLevels(levels)
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
      'bg-slate-50 text-slate-800 border border-slate-200',
      'bg-amber-50 text-amber-800 border border-amber-200',
      'bg-orange-50 text-orange-800 border border-orange-200',
      'bg-emerald-50 text-emerald-800 border border-emerald-200',
      'bg-blue-50 text-blue-800 border border-blue-200',
      'bg-purple-50 text-purple-800 border border-purple-200',
      'bg-pink-50 text-pink-800 border border-pink-200',
    ]
    return colors[order - 1] || 'bg-slate-50 text-slate-800 border border-slate-200'
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading job levels...</p>
        </div>
      </div>
    )
  }

  // Filter job levels based on debounced search term
  const filteredJobLevels = !debouncedSearchTerm
    ? jobLevels
    : jobLevels.filter(jobLevel =>
        jobLevel.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        jobLevel.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Levels</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage organizational hierarchy levels — drag and drop to reorder
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Job Level
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Job Level</DialogTitle>
              <DialogDescription>
                Add a new job level to the organizational hierarchy
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Job Level Name *</Label>
                <Input
                  id="name"
                  value={newJobLevel.name}
                  onChange={(e) => setNewJobLevel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., RF4, OF3, M3"
                />
              </div>

              <div className="space-y-1.5">
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Crown className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Job Levels</p>
              <p className="text-2xl font-bold text-gray-900">{jobLevels.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hierarchy Range</p>
              <p className="text-lg font-bold text-gray-900">
                {jobLevels.length > 0 ? `${jobLevels[0]?.name} – ${jobLevels[jobLevels.length - 1]?.name}` : 'None'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Levels</p>
              <p className="text-2xl font-bold text-gray-900">
                {jobLevels.filter(j => j.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search job levels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Drag-and-drop List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Organizational Hierarchy</h2>
          <p className="text-sm text-gray-500 mt-0.5">Drag and drop to reorder hierarchy levels. Lower position = lower rank.</p>
        </div>
        <div className="p-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="job-levels">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {filteredJobLevels.map((jobLevel, index) => (
                    <Draggable key={jobLevel.id} draggableId={jobLevel.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 px-4 py-3 border rounded-lg transition-all ${
                            snapshot.isDragging
                              ? 'shadow-lg border-blue-300 bg-blue-50'
                              : 'border-gray-100 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>

                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getHierarchyColor(jobLevel.order)}`}>
                            #{jobLevel.order}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{jobLevel.name}</p>
                            {jobLevel.description && (
                              <p className="text-sm text-gray-500 truncate">{jobLevel.description}</p>
                            )}
                          </div>

                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            jobLevel.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {jobLevel.isActive ? 'Active' : 'Inactive'}
                          </span>

                          <div className="flex items-center gap-2">
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
                                    Are you sure you want to delete &quot;{jobLevel.name}&quot;? This action cannot be undone
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
              <Crown className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No job levels found</p>
              <p className="text-gray-400 text-sm mt-1">
                Get started by creating your organizational hierarchy levels.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Job Level
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hierarchy Guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900">Default Hierarchy Guide</h2>
          <p className="text-sm text-blue-600 mt-0.5">Recommended organizational hierarchy structure</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Rank and File Levels</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>RF1:</strong> Entry level positions</li>
                <li>• <strong>RF2:</strong> Junior level with experience</li>
                <li>• <strong>RF3:</strong> Senior rank and file</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Management Levels</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>OF1:</strong> Junior officer/supervisor</li>
                <li>• <strong>OF2:</strong> Senior officer</li>
                <li>• <strong>M1:</strong> Manager level</li>
                <li>• <strong>M2:</strong> Senior manager (highest)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Job Level</DialogTitle>
            <DialogDescription>
              Update job level information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Job Level Name *</Label>
              <Input
                id="edit-name"
                value={newJobLevel.name}
                onChange={(e) => setNewJobLevel(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., RF4, OF3, M3"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newJobLevel.description}
                onChange={(e) => setNewJobLevel(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter job level description"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="edit-job-level-status">Status</Label>
                <p className="text-sm text-gray-500">
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
          <div className="bg-white border border-red-200 rounded-xl shadow-sm p-4">
            <div className="text-red-800 text-sm">{error}</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setError('')}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
