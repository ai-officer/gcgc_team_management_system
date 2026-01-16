'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Shield, ShieldCheck, ShieldX, Eye, EyeOff, Users2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Pagination, PaginationInfo } from '@/components/ui/pagination'
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

interface Admin {
  id: string
  username: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdmins()
  }, [pagination.page, debouncedSearchTerm, includeInactive])

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchAdmins = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(includeInactive && { includeInactive: 'true' })
      })

      const response = await fetch(`/api/admin/admins?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setAdmins(data.admins || [])
        setPagination(data.pagination)
      } else {
        setError('Failed to fetch admins')
      }
    } catch (err) {
      setError('Error fetching admins')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (newAdmin.password !== newAdmin.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newAdmin.username,
          password: newAdmin.password
        }),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewAdmin({ username: '', password: '', confirmPassword: '' })
        fetchAdmins()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create admin')
      }
    } catch (err) {
      setError('Error creating admin')
    } finally {
      setSaving(false)
    }
  }

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return

    if (newAdmin.password && newAdmin.password !== newAdmin.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setSaving(true)
      const updateData: any = {
        username: newAdmin.username
      }

      if (newAdmin.password) {
        updateData.password = newAdmin.password
      }

      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setSelectedAdmin(null)
        setNewAdmin({ username: '', password: '', confirmPassword: '' })
        fetchAdmins()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update admin')
      }
    } catch (err) {
      setError('Error updating admin')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (adminId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (response.ok) {
        fetchAdmins()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update admin status')
      }
    } catch (err) {
      setError('Error updating admin status')
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAdmins()
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete admin')
      }
    } catch (err) {
      setError('Error deleting admin')
    }
  }

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin)
    setNewAdmin({
      username: admin.username,
      password: '',
      confirmPassword: ''
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setNewAdmin({ username: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setError('')
  }

  if (loading && admins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading administrators...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Administrator Management</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage administrator accounts with secure access control
          </p>
        </div>
        
        <Dialog 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Administrator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Administrator</DialogTitle>
              <DialogDescription>
                Add a new administrator account with secure credentials
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username (min 3 characters)"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password (min 6 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={newAdmin.confirmPassword}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
                onClick={handleCreateAdmin} 
                disabled={!newAdmin.username.trim() || !newAdmin.password || !newAdmin.confirmPassword || saving}
              >
                {saving ? 'Creating...' : 'Create Administrator'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search administrators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          <Label htmlFor="include-inactive" className="text-sm">
            Include inactive
          </Label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Total Administrators</CardTitle>
            <Shield className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              Admin accounts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Active Administrators</CardTitle>
            <ShieldCheck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {admins.filter(admin => admin.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Inactive Administrators</CardTitle>
            <ShieldX className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {includeInactive ? admins.filter(admin => !admin.isActive).length : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Deactivated accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Administrators List */}
      <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-900">Administrator Accounts</CardTitle>
          <CardDescription className="text-sm font-medium text-slate-600">
            Manage administrator access and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length > 0 ? (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center ring-2 ring-slate-200">
                      <Users2 className="h-5 w-5 text-blue-600" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">{admin.username}</h3>
                      <p className="text-sm font-medium text-slate-500">
                        Created {new Date(admin.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`active-${admin.id}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`active-${admin.id}`}
                        checked={admin.isActive}
                        onCheckedChange={(checked) => handleToggleActive(admin.id, checked)}
                      />
                    </div>
                    
                    <Badge variant={admin.isActive ? "default" : "secondary"} className="rounded-md px-2.5 py-0.5 text-xs font-medium">
                      {admin.isActive ? "Active" : "Inactive"}
                    </Badge>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`${admin.isActive ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                            disabled={admin.isActive}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Administrator</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the administrator "{admin.username}"? 
                              This action cannot be undone and will permanently remove their access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAdmin(admin.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No administrators match your search criteria.' : 'Get started by creating your first administrator.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border border-amber-200 bg-amber-50 rounded-xl shadow-sm">
        <CardHeader className="border-b border-amber-100">
          <CardTitle className="text-lg font-semibold text-amber-900">Security Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-800">
            <div>
              <h4 className="font-semibold mb-2">Account Security</h4>
              <ul className="space-y-1">
                <li>• Use strong passwords (min 6 characters)</li>
                <li>• Usernames must be unique</li>
                <li>• Deactivate unused accounts promptly</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Deletion Rules</h4>
              <ul className="space-y-1">
                <li>• Only inactive accounts can be deleted</li>
                <li>• Cannot delete your own account</li>
                <li>• At least one active admin must exist</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update administrator account information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username *</Label>
              <Input
                id="edit-username"
                value={newAdmin.username}
                onChange={(e) => setNewAdmin(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {newAdmin.password && (
              <div>
                <Label htmlFor="edit-confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="edit-confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={newAdmin.confirmPassword}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            
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
              onClick={handleEditAdmin} 
              disabled={!newAdmin.username.trim() || saving}
            >
              {saving ? 'Updating...' : 'Update Administrator'}
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