'use client'

import { useState, useEffect } from 'react'
import { Plus, Building2, Edit, Trash2, Search } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sections Management</h1>
          <p className="text-gray-600">Manage organizational sections within departments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Section</DialogTitle>
              <DialogDescription>
                Add a new section within a department to organize teams and users.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
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
              <div className="grid gap-2">
                <Label htmlFor="name">Section Name</Label>
                <Input
                  id="name"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  placeholder="Enter section name"
                />
              </div>
              <div className="grid gap-2">
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

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sections</p>
              <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {sections.reduce((acc, s) => acc + (s._count?.teamLabels || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building2 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Sections</p>
              <p className="text-2xl font-bold text-gray-900">
                {sections.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sections Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <div className="flex space-x-1 mt-1">
                        {section.code && (
                          <Badge className="bg-gray-100 text-gray-700 text-xs">
                            {section.code}
                          </Badge>
                        )}
                        <Badge variant={section.isActive ? "default" : "secondary"} className="text-xs">
                          {section.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
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
                            Are you sure you want to delete "{section.name}"? This action cannot be undone 
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
                </div>
                <CardDescription>
                  {section.department.division.name} → {section.department.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{section._count?.teamLabels || 0}</div>
                    <div>Team Labels</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {new Date(section.createdAt).toLocaleDateString()}
                    </div>
                    <div>Created</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Section Dialog */}
      {editingSection && (
        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section: {editingSection.name}</DialogTitle>
              <DialogDescription>
                Update section information and department assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
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
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Section Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">Section Code</Label>
                <Input
                  id="edit-code"
                  defaultValue={editingSection.code || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, code: e.target.value.toUpperCase() })}
                  maxLength={5}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="edit-section-status">Status</Label>
                  <p className="text-sm text-gray-600">
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

      {sections.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No sections found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No sections match your search criteria.' : 'Get started by creating your first section.'}
          </p>
        </div>
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