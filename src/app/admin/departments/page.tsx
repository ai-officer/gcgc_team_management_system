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
import { toast } from '@/hooks/use-toast'

interface Department {
  id: string
  name: string
  code?: string
  divisionId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  division: {
    id: string
    name: string
  }
  sections: Array<{
    id: string
    name: string
    code?: string
  }>
  _count?: {
    sections: number
  }
}

interface Division {
  id: string
  name: string
  code?: string
}

interface CreateDepartmentData {
  name: string
  code?: string
  divisionId: string
}

interface UpdateDepartmentData {
  name?: string
  code?: string
  divisionId?: string
  isActive?: boolean
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  const [newDepartment, setNewDepartment] = useState<CreateDepartmentData>({
    name: '',
    code: '',
    divisionId: ''
  })

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchDepartments = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeInactive: 'true',
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/departments?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDepartments(data.departments || [])
        setPagination(data.pagination || pagination)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to fetch departments'
        })
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch departments'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/admin/divisions')
      const data = await response.json()

      if (response.ok) {
        setDivisions(data.divisions || [])
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to fetch divisions'
        })
      }
    } catch (error) {
      console.error('Error fetching divisions:', error)
    }
  }

  useEffect(() => {
    fetchDepartments()
    fetchDivisions()
  }, [pagination.page, debouncedSearchTerm])

  const handleCreateDepartment = async () => {
    try {
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDepartment)
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewDepartment({ name: '', code: '', divisionId: '' })
        fetchDepartments()
        toast({
          title: 'Success',
          description: 'Department created successfully'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to create department'
        })
      }
    } catch (error) {
      console.error('Error creating department:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create department'
      })
    }
  }

  const handleUpdateDepartment = async (departmentId: string, updateData: UpdateDepartmentData) => {
    try {
      const response = await fetch(`/api/admin/departments/${departmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (response.ok) {
        fetchDepartments()
        setEditingDepartment(null)
        toast({
          title: 'Success',
          description: 'Department updated successfully'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update department'
        })
      }
    } catch (error) {
      console.error('Error updating department:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update department'
      })
    }
  }


  const handleDeleteDepartment = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/admin/departments/${departmentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        fetchDepartments()
        toast({
          title: 'Success',
          description: data.message || 'Department deleted successfully'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete department'
        })
      }
    } catch (error) {
      console.error('Error deleting department:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete department'
      })
    }
  }

  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.division.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments Management</h1>
          <p className="text-gray-600">Manage organizational departments within divisions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new department within a division to organize sections and teams.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="division">Division</Label>
                <Select 
                  value={newDepartment.divisionId} 
                  onValueChange={(value) => setNewDepartment({ ...newDepartment, divisionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name} {division.code && `(${division.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  placeholder="Enter department name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Department Code (Optional)</Label>
                <Input
                  id="code"
                  value={newDepartment.code}
                  onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value.toUpperCase() })}
                  placeholder="Enter department code (e.g., IT, HR)"
                  maxLength={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDepartment} 
                disabled={!newDepartment.name.trim() || !newDepartment.divisionId}
              >
                Create Department
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
            placeholder="Search departments..."
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
              <p className="text-sm font-medium text-gray-600">Total Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sections</p>
              <p className="text-2xl font-bold text-gray-900">
                {departments.reduce((acc, d) => acc + (d._count?.sections || 0), 0)}
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
              <p className="text-sm font-medium text-gray-600">Divisions</p>
              <p className="text-2xl font-bold text-gray-900">{divisions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building2 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Departments</p>
              <p className="text-2xl font-bold text-gray-900">
                {departments.filter(d => d.isActive).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((department) => (
            <Card key={department.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <div className="flex space-x-1 mt-1">
                        {department.code && (
                          <Badge className="bg-gray-100 text-gray-700 text-xs">
                            {department.code}
                          </Badge>
                        )}
                        <Badge variant={department.isActive ? "default" : "secondary"} className="text-xs">
                          {department.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingDepartment(department)}
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
                          <AlertDialogTitle>Delete Department</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{department.name}"? This action cannot be undone 
                            and will affect all associated sections.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteDepartment(department.id)}
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
                  Division: {department.division.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{department._count?.sections || 0}</div>
                    <div>Sections</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {new Date(department.createdAt).toLocaleDateString()}
                    </div>
                    <div>Created</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Department Dialog */}
      {editingDepartment && (
        <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Department: {editingDepartment.name}</DialogTitle>
              <DialogDescription>
                Update department information and division assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-division">Division</Label>
                <Select 
                  value={editingDepartment.divisionId} 
                  onValueChange={(value) => setEditingDepartment({ ...editingDepartment, divisionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name} {division.code && `(${division.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Department Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingDepartment.name}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">Department Code</Label>
                <Input
                  id="edit-code"
                  defaultValue={editingDepartment.code || ''}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, code: e.target.value.toUpperCase() })}
                  maxLength={10}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="edit-department-status">Status</Label>
                  <p className="text-sm text-gray-600">
                    Set whether this department is active or inactive
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {editingDepartment.isActive ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    id="edit-department-status"
                    checked={editingDepartment.isActive}
                    onCheckedChange={(checked) => setEditingDepartment({ ...editingDepartment, isActive: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDepartment(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateDepartment(editingDepartment.id, {
                name: editingDepartment.name,
                code: editingDepartment.code || undefined,
                divisionId: editingDepartment.divisionId,
                isActive: editingDepartment.isActive
              })}>
                Update Department
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {filteredDepartments.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No departments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No departments match your search criteria.' : 'Get started by creating your first department.'}
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