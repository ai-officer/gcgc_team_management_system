'use client'

import { useState, useEffect } from 'react'
import { Plus, GitBranch, Edit, Trash2, Search, Building2, Users } from 'lucide-react'
import Link from 'next/link'
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [newDivision, setNewDivision] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDivisions()
  }, [searchTerm])

  const fetchDivisions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        includeDepartments: 'true',
        includeInactive: 'true',
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/admin/divisions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDivisions(data.divisions || [])
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

  const getDivisionTypeInfo = (division: Division) => {
    const flowTypes: Record<string, { label: string; color: string; description: string }> = {
      'RP': { label: 'Dd3 → Sections', color: 'bg-blue-100 text-blue-800', description: 'Real Property flow to departments then sections' },
      'HO': { label: 'Dd4 → Teams', color: 'bg-green-100 text-green-800', description: 'Hotel Operations with sector head & codes' },
      'HF': { label: 'Future', color: 'bg-gray-100 text-gray-800', description: 'Hotel Franchising (for later)' },
      'SSGOLI': { label: 'Dd5 → Inputs', color: 'bg-purple-100 text-purple-800', description: 'Shared Services with section/team inputs' },
      'CSO': { label: 'Dd6 → Labels', color: 'bg-orange-100 text-orange-800', description: 'CSO with section/team labels' },
      'OTHER': { label: 'Custom Input', color: 'bg-yellow-100 text-yellow-800', description: 'Custom label input' }
    }
    return flowTypes[division.code || ''] || flowTypes['OTHER']
  }

  const filteredDivisions = divisions.filter(division =>
    division.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    division.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    division.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading divisions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Division Management</h1>
          <p className="text-gray-600 mt-1">
            Manage organizational divisions and their hierarchical dropdown flows
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Division
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Division</DialogTitle>
              <DialogDescription>
                Add a new division to the organizational structure
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Division Name *</Label>
                <Input
                  id="name"
                  value={newDivision.name}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter division name"
                />
              </div>
              
              <div>
                <Label htmlFor="code">Division Code</Label>
                <Input
                  id="code"
                  value={newDivision.code}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter division code (optional)"
                />
              </div>
              
              <div>
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
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search divisions..."
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
            <CardTitle className="text-sm font-medium">Total Divisions</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{divisions.length}</div>
            <p className="text-xs text-muted-foreground">
              Organizational divisions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {divisions.reduce((sum, div) => sum + div._count.departments, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all divisions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Divisions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {divisions.filter(d => d.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Divisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDivisions.map((division) => {
          const typeInfo = getDivisionTypeInfo(division)
          
          return (
            <Card key={division.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{division.name}</CardTitle>
                    {division.code && (
                      <Badge variant="outline" className="text-xs">
                        {division.code}
                      </Badge>
                    )}
                  </div>
                  <Badge className={`text-xs ${typeInfo.color}`}>
                    {typeInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {division.description && (
                  <p className="text-sm text-gray-600">{division.description}</p>
                )}
                
                <div className="text-sm text-gray-500">
                  <strong>{division._count.departments}</strong> departments
                </div>
                
                <div className="text-xs text-gray-400">
                  {typeInfo.description}
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Badge variant={division.isActive ? "default" : "secondary"}>
                    {division.isActive ? "Active" : "Inactive"}
                  </Badge>
                  
                  <div className="flex items-center space-x-2">
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
                            Are you sure you want to delete "{division.name}"? This action cannot be undone
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
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredDivisions.length === 0 && !loading && (
        <div className="text-center py-12">
          <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No divisions found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'No divisions match your search criteria.' : 'Get started by creating your first division.'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>
              Update division information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Division Name *</Label>
              <Input
                id="edit-name"
                value={newDivision.name}
                onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter division name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-code">Division Code</Label>
              <Input
                id="edit-code"
                value={newDivision.code}
                onChange={(e) => setNewDivision(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter division code (optional)"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newDivision.description}
                onChange={(e) => setNewDivision(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter division description (optional)"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="edit-status">Status</Label>
                <p className="text-sm text-gray-600">
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