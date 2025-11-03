'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Edit, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

interface SectorHead {
  id: string
  initials: string
  fullName: string
  description?: string
  divisionId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CreateSectorHeadData {
  initials: string
  fullName: string
  description?: string
  divisionId?: string
}

interface UpdateSectorHeadData {
  initials?: string
  fullName?: string
  description?: string
  divisionId?: string
  isActive?: boolean
}

export default function AdminSectorHeadsPage() {
  const [sectorHeads, setSectorHeads] = useState<SectorHead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSectorHead, setEditingSectorHead] = useState<SectorHead | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  const [newSectorHead, setNewSectorHead] = useState<CreateSectorHeadData>({
    initials: '',
    fullName: '',
    description: '',
    divisionId: ''
  })

  const fetchSectorHeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeInactive: 'true',
        search: searchTerm
      })

      const response = await fetch(`/api/admin/sector-heads?${params}`)
      if (!response.ok) throw new Error('Failed to fetch sector heads')
      
      const data = await response.json()
      setSectorHeads(data.sectorHeads || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.totalItems || 0,
        totalPages: data.pagination?.totalPages || 0
      }))
    } catch (error) {
      console.error('Error fetching sector heads:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch sector heads',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSectorHeads()
  }, [pagination.page, searchTerm])

  const handleCreateSectorHead = async () => {
    try {
      if (!newSectorHead.initials.trim() || !newSectorHead.fullName.trim()) {
        toast({
          title: 'Error',
          description: 'Initials and full name are required',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/admin/sector-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSectorHead)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sector head')
      }

      toast({
        title: 'Success',
        description: 'Sector head created successfully'
      })

      setIsCreateDialogOpen(false)
      setNewSectorHead({ initials: '', fullName: '', description: '', divisionId: '' })
      fetchSectorHeads()
    } catch (error) {
      console.error('Error creating sector head:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create sector head',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateSectorHead = async (id: string, updates: UpdateSectorHeadData) => {
    try {
      const response = await fetch(`/api/admin/sector-heads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update sector head')
      }

      toast({
        title: 'Success',
        description: 'Sector head updated successfully'
      })

      setEditingSectorHead(null)
      fetchSectorHeads()
    } catch (error) {
      console.error('Error updating sector head:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update sector head',
        variant: 'destructive'
      })
    }
  }


  const handleDeleteSectorHead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/sector-heads/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete sector head')
      }

      toast({
        title: 'Success',
        description: 'Sector head deleted successfully'
      })

      fetchSectorHeads()
    } catch (error) {
      console.error('Error deleting sector head:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete sector head',
        variant: 'destructive'
      })
    }
  }

  const handleEditSubmit = () => {
    if (!editingSectorHead) return
    
    if (!editingSectorHead.initials.trim() || !editingSectorHead.fullName.trim()) {
      toast({
        title: 'Error',
        description: 'Initials and full name are required',
        variant: 'destructive'
      })
      return
    }

    handleUpdateSectorHead(editingSectorHead.id, {
      initials: editingSectorHead.initials,
      fullName: editingSectorHead.fullName,
      description: editingSectorHead.description,
      divisionId: editingSectorHead.divisionId,
      isActive: editingSectorHead.isActive
    })
  }

  const filteredSectorHeads = sectorHeads.filter(sh =>
    sh.initials.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sh.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sh.description && sh.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sector Heads</h1>
          <p className="text-sm font-medium text-slate-600">
            Manage sector heads for hotel operations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Sector Head
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sector Head</DialogTitle>
              <DialogDescription>
                Add a new sector head for hotel operations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="initials">Initials *</Label>
                <Input
                  id="initials"
                  value={newSectorHead.initials}
                  onChange={(e) => setNewSectorHead(prev => ({ ...prev, initials: e.target.value }))}
                  placeholder="e.g., JD, ABC"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={newSectorHead.fullName}
                  onChange={(e) => setNewSectorHead(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newSectorHead.description}
                  onChange={(e) => setNewSectorHead(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSectorHead}>Create Sector Head</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search sector heads by initials, name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading sector heads...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSectorHeads.map((sectorHead) => (
              <Card key={sectorHead.id} className="relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="p-2 bg-blue-50 rounded-lg mr-2">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      {sectorHead.initials}
                    </CardTitle>
                    <Badge variant={sectorHead.isActive ? 'default' : 'secondary'} className="rounded-md px-2.5 py-0.5 text-xs font-medium">
                      {sectorHead.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm font-medium text-slate-600 mt-1">{sectorHead.fullName}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {sectorHead.description && (
                    <p className="text-sm font-medium text-slate-600 mb-4">
                      {sectorHead.description}
                    </p>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Dialog 
                      open={editingSectorHead?.id === sectorHead.id} 
                      onOpenChange={(open) => !open && setEditingSectorHead(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSectorHead(sectorHead)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Sector Head</DialogTitle>
                          <DialogDescription>
                            Update sector head information
                          </DialogDescription>
                        </DialogHeader>
                        {editingSectorHead && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-initials">Initials *</Label>
                              <Input
                                id="edit-initials"
                                value={editingSectorHead.initials}
                                onChange={(e) => setEditingSectorHead(prev => 
                                  prev ? { ...prev, initials: e.target.value } : null
                                )}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-fullName">Full Name *</Label>
                              <Input
                                id="edit-fullName"
                                value={editingSectorHead.fullName}
                                onChange={(e) => setEditingSectorHead(prev => 
                                  prev ? { ...prev, fullName: e.target.value } : null
                                )}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={editingSectorHead.description || ''}
                                onChange={(e) => setEditingSectorHead(prev => 
                                  prev ? { ...prev, description: e.target.value } : null
                                )}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div className="space-y-1">
                                <Label htmlFor="edit-sector-head-status">Status</Label>
                                <p className="text-sm text-gray-600">
                                  Set whether this sector head is active or inactive
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">
                                  {editingSectorHead.isActive ? "Active" : "Inactive"}
                                </span>
                                <Switch
                                  id="edit-sector-head-status"
                                  checked={editingSectorHead.isActive}
                                  onCheckedChange={(checked) => setEditingSectorHead(prev => 
                                    prev ? { ...prev, isActive: checked } : null
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingSectorHead(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleEditSubmit}>Update Sector Head</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Sector Head</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{sectorHead.initials} - {sectorHead.fullName}&quot;? 
                            This will deactivate the sector head.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSectorHead(sectorHead.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSectorHeads.length === 0 && !loading && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-muted-foreground">No sector heads found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new sector head.'}
              </p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sector heads
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

