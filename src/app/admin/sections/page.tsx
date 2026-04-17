'use client'

import { useState, useEffect } from 'react'
import { Plus, Building2, Edit, Trash2, Search } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Section {
  id: string
  name: string
  code?: string
  departmentId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  department: {
    id: string
    name: string
    division: {
      id: string
      name: string
    }
  }
  teamLabels: Array<{
    id: string
    name: string
    code?: string
  }>
  _count?: {
    teamLabels: number
  }
}

interface Department {
  id: string
  name: string
  division: {
    id: string
    name: string
  }
}

interface CreateSectionData {
  name: string
  code?: string
  departmentId: string
}

interface UpdateSectionData {
  name?: string
  code?: string
  departmentId?: string
  isActive?: boolean
}

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  const [newSection, setNewSection] = useState<CreateSectionData>({
    name: '',
    code: '',
    departmentId: ''
  })

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchSections = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeInactive: 'true',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })

      const response = await fetch(`/api/admin/sections?${params}`)
      const data = await response.json()

      if (response.ok) {
        setSections(data.sections)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments')
      const data = await response.json()

      if (response.ok) {
        setDepartments(data.departments)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  useEffect(() => {
    fetchSections()
    fetchDepartments()
  }, [pagination.page, debouncedSearchTerm])

  const handleCreateSection = async () => {
    try {
      const response = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection)
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewSection({ name: '', code: '', departmentId: '' })
        fetchSections()
      }
    } catch (error) {
      console.error('Error creating section:', error)
    }
  }

  const handleUpdateSection = async (sectionId: string, updateData: UpdateSectionData) => {
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        fetchSections()
        setEditingSection(null)
      }
    } catch (error) {
      console.error('Error updating section:', error)
    }
  }


  const handleDeleteSection = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchSections()
      }
    } catch (error) {
      console.error('Error deleting section:', error)
    }
  }

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage organizational sections within departments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Section
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Section</DialogTitle>
              <DialogDescription>
                Add a new section within a department to organize teams and users.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={newSection.departmentId}
                  onValueChange={(value) => setNewSection({ ...newSection, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.division.name} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Section Name</Label>
                <Input
                  id="name"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  placeholder="Enter section name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Section Code (Optional)</Label>
                <Input
                  id="code"
                  value={newSection.code}
                  onChange={(e) => setNewSection({ ...newSection, code: e.target.value.toUpperCase() })}
                  placeholder="Enter section code (e.g., DEV, MKT)"
                  maxLength={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSection}
                disabled={!newSection.name.trim() || !newSection.departmentId}
              >
                Create Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sections</p>
              <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {sections.reduce((acc, s) => acc + (s._count?.teamLabels || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Sections</p>
              <p className="text-2xl font-bold text-gray-900">
                {sections.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : sections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No sections found</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm ? 'No sections match your search criteria.' : 'Get started by creating your first section.'}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first Section
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Section</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Code</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Department</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Division</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Teams</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Status</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Created</th>
                <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.map((section) => (
                <tr key={section.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{section.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{section.code || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{section.department.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{section.department.division.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{section._count?.teamLabels || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      section.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {section.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(section.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSection(section)}
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
                            <AlertDialogTitle>Delete Section</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{section.name}&quot;? This action cannot be undone
                              and will remove all associated team labels.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSection(section.id)}
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

      {/* Edit Section Dialog */}
      {editingSection && (
        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>
                Update section information and department assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={editingSection.departmentId}
                  onValueChange={(value) => setEditingSection({ ...editingSection, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.division.name} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Section Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Section Code</Label>
                <Input
                  id="edit-code"
                  defaultValue={editingSection.code || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, code: e.target.value.toUpperCase() })}
                  maxLength={5}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-section-status">Status</Label>
                  <p className="text-sm text-gray-500">
                    Set whether this section is active or inactive
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {editingSection.isActive ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    id="edit-section-status"
                    checked={editingSection.isActive}
                    onCheckedChange={(checked) => setEditingSection({ ...editingSection, isActive: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateSection(editingSection.id, {
                name: editingSection.name,
                code: editingSection.code || undefined,
                departmentId: editingSection.departmentId,
                isActive: editingSection.isActive
              })}>
                Update Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-gray-600">
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
