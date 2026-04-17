'use client'

import { useState, useEffect } from 'react'
import { Plus, GitBranch, Edit, Trash2, Search, Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Pagination, PaginationInfo } from '@/components/ui/pagination'

interface Division {
  id: string
  name: string
  code?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  departments: Department[]
  _count: {
    departments: number
  }
}

interface Department {
  id: string
  name: string
  code?: string
}

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0
  })
  const [newDivision, setNewDivision] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  })
  const [error, setError] = useState('')

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchDivisions()
  }, [pagination.page, debouncedSearchTerm])

  const fetchDivisions = async () => {
    try {
      const params = new URLSearchParams({
        includeDepartments: 'true',
        includeInactive: 'true',
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })

      const response = await fetch(`/api/admin/divisions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDivisions(data.divisions || [])
        if (data.pagination) {
          setPagination(data.pagination)
        }
      } else {
        setError('Failed to fetch divisions')
      }
    } catch (err) {
      setError('Error fetching divisions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDivision = async () => {
    try {
      const response = await fetch('/api/admin/divisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDivision),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewDivision({ name: '', code: '', description: '', isActive: true })
        fetchDivisions()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create division')
      }
    } catch (err) {
      setError('Error creating division')
    }
  }

  const handleEditDivision = async () => {
    if (!selectedDivision) return

    try {
      const response = await fetch(`/api/admin/divisions/${selectedDivision.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDivision.name,
          code: newDivision.code,
          description: newDivision.description,
          isActive: newDivision.isActive,
        }),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setSelectedDivision(null)
        setNewDivision({ name: '', code: '', description: '', isActive: true })
        fetchDivisions()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update division')
      }
    } catch (err) {
      setError('Error updating division')
    }
  }

  const handleDeleteDivision = async (divisionId: string) => {
    try {
      const response = await fetch(`/api/admin/divisions/${divisionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDivisions()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete division')
      }
    } catch (err) {
      setError('Error deleting division')
    }
  }


  const openEditDialog = (division: Division) => {
    setSelectedDivision(division)
    setNewDivision({
      name: division.name,
      code: division.code || '',
      description: division.description || '',
      isActive: division.isActive
    })
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading divisions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Divisions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage organizational divisions and their hierarchical structures
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Division
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Division</DialogTitle>
              <DialogDescription>
                Add a new division to the organizational structure
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Division Name *</Label>
                <Input
                  id="name"
                  value={newDivision.name}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter division name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code">Division Code</Label>
                <Input
                  id="code"
                  value={newDivision.code}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter division code (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDivision.description}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter division description (optional)"
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
              <Button onClick={handleCreateDivision} disabled={!newDivision.name.trim()}>
                Create Division
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
              <GitBranch className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Divisions</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Departments</p>
              <p className="text-2xl font-bold text-gray-900">
                {divisions.reduce((sum, div) => sum + div._count.departments, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Divisions</p>
              <p className="text-2xl font-bold text-gray-900">
                {divisions.filter(d => d.isActive).length}
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
            placeholder="Search divisions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {divisions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <GitBranch className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No divisions found</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm ? 'No divisions match your search criteria.' : 'Get started by creating your first division.'}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first Division
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Division</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Code</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Description</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Departments</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Status</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {divisions.map((division) => (
                <tr key={division.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{division.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{division.code || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{division.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{division._count.departments}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      division.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {division.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(division)}
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
                            <AlertDialogTitle>Delete Division</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{division.name}&quot;? This action cannot be undone
                              and will affect all associated departments and data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDivision(division.id)}
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <PaginationInfo
              currentPage={pagination.page}
              pageSize={pagination.limit}
              totalItems={pagination.total}
            />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination({ ...pagination, page })}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>
              Update division information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Division Name *</Label>
              <Input
                id="edit-name"
                value={newDivision.name}
                onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter division name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Division Code</Label>
              <Input
                id="edit-code"
                value={newDivision.code}
                onChange={(e) => setNewDivision(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter division code (optional)"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newDivision.description}
                onChange={(e) => setNewDivision(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter division description (optional)"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="edit-status">Status</Label>
                <p className="text-sm text-gray-500">
                  Set whether this division is active or inactive
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {newDivision.isActive ? "Active" : "Inactive"}
                </span>
                <Switch
                  id="edit-status"
                  checked={newDivision.isActive}
                  onCheckedChange={(checked) => setNewDivision(prev => ({ ...prev, isActive: checked }))}
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
            <Button onClick={handleEditDivision} disabled={!newDivision.name.trim()}>
              Update Division
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
