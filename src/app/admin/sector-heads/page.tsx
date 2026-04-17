'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Edit, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

interface User {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

export default function AdminSectorHeadsPage() {
  const [sectorHeads, setSectorHeads] = useState<SectorHead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSectorHead, setEditingSectorHead] = useState<SectorHead | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
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
  const [userSearchTerm, setUserSearchTerm] = useState('')

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

    const fetchSectorHeads = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeInactive: 'true',
        search: debouncedSearchTerm
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
  }, [pagination.page, debouncedSearchTerm])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!userSearchTerm) return true
    const searchLower = userSearchTerm.toLowerCase()
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    )
  })

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    const user = users.find(u => u.id === userId)
    if (user) {
      // Generate initials from user name (first letters of first and last name)
      const nameParts = user.name.split(' ')
      const initials = nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : user.name.slice(0, 2).toUpperCase()

      setNewSectorHead(prev => ({
        ...prev,
        initials,
        fullName: user.name
      }))
    }
  }

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
      setSelectedUserId('')
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

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sector Heads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage sector heads for hotel operations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setSelectedUserId('')
            setUserSearchTerm('')
            setNewSectorHead({ initials: '', fullName: '', description: '', divisionId: '' })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Sector Head
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Sector Head</DialogTitle>
              <DialogDescription>
                Add a new sector head for hotel operations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-select">Select User *</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10 mb-2"
                  />
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedUserId === user.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => handleUserSelect(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{user.name}</span>
                          <span className="text-xs text-gray-500 truncate">{user.email}</span>
                        </div>
                        {selectedUserId === user.id && (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Selected</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {selectedUserId && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="initials">Initials (Auto-generated)</Label>
                    <Input
                      id="initials"
                      value={newSectorHead.initials}
                      onChange={(e) => setNewSectorHead(prev => ({ ...prev, initials: e.target.value }))}
                      placeholder="e.g., JD, ABC"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name (From User)</Label>
                    <Input
                      id="fullName"
                      value={newSectorHead.fullName}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
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
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false)
                setSelectedUserId('')
                setUserSearchTerm('')
                setNewSectorHead({ initials: '', fullName: '', description: '', divisionId: '' })
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateSectorHead} disabled={!selectedUserId}>Create Sector Head</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search sector heads by initials, name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sector Heads</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {sectorHeads.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Users className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">
                {sectorHeads.filter(s => !s.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : sectorHeads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No sector heads found</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new sector head.'}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first Sector Head
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Initials</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Full Name</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Description</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Status</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Created</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sectorHeads.map((sectorHead) => (
                <tr key={sectorHead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">{sectorHead.initials}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{sectorHead.initials}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{sectorHead.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{sectorHead.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      sectorHead.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {sectorHead.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(sectorHead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Edit Sector Head</DialogTitle>
                            <DialogDescription>
                              Update sector head information
                            </DialogDescription>
                          </DialogHeader>
                          {editingSectorHead && (
                            <div className="space-y-4 py-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-initials">Initials *</Label>
                                <Input
                                  id="edit-initials"
                                  value={editingSectorHead.initials}
                                  onChange={(e) => setEditingSectorHead(prev =>
                                    prev ? { ...prev, initials: e.target.value } : null
                                  )}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-fullName">Full Name *</Label>
                                <Input
                                  id="edit-fullName"
                                  value={editingSectorHead.fullName}
                                  onChange={(e) => setEditingSectorHead(prev =>
                                    prev ? { ...prev, fullName: e.target.value } : null
                                  )}
                                />
                              </div>
                              <div className="space-y-1.5">
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
                                <div className="space-y-0.5">
                                  <Label htmlFor="edit-sector-head-status">Status</Label>
                                  <p className="text-sm text-gray-500">
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
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Sector Head</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete &quot;{sectorHead.initials} - {sectorHead.fullName}&quot;?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSectorHead(sectorHead.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sector heads
          </p>
          <div className="flex gap-2">
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
    </div>
  )
}
