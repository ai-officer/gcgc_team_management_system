'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, User, Mail, Calendar, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Badge } from '@/components/ui/badge'
import { Pagination, PaginationInfo } from '@/components/ui/pagination'
import { UserRole, HierarchyLevel } from '@prisma/client'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  hierarchyLevel: HierarchyLevel | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  teamMembers: Array<{
    team: {
      id: string
      name: string
    }
  }>
  _count: {
    assignedTasks: number
    createdTasks: number
  }
}

interface CreateUserData {
  email: string
  password: string
  name: string
  role: UserRole
  hierarchyLevel: HierarchyLevel
}

interface UpdateUserData {
  name?: string
  role?: UserRole
  hierarchyLevel?: HierarchyLevel
  isActive?: boolean
  password?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [hierarchyFilter, setHierarchyFilter] = useState<HierarchyLevel | 'all'>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0
  })

  const [newUser, setNewUser] = useState<CreateUserData>({
    email: '',
    password: '',
    name: '',
    role: UserRole.MEMBER,
    hierarchyLevel: HierarchyLevel.RF1
  })

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(hierarchyFilter !== 'all' && { hierarchyLevel: hierarchyFilter })
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, searchTerm, roleFilter, hierarchyFilter])

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewUser({
          email: '',
          password: '',
          name: '',
          role: UserRole.MEMBER,
          hierarchyLevel: HierarchyLevel.RF1
        })
        fetchUsers()
      }
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleUpdateUser = async (userId: string, updateData: UpdateUserData) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        fetchUsers()
        setEditingUser(null)
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-100 text-red-700 border-red-200'
      case UserRole.LEADER: return 'bg-blue-100 text-blue-700 border-blue-200'
      case UserRole.MEMBER: return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getHierarchyColor = (level: HierarchyLevel) => {
    const hierarchyOrder = ['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'M1', 'M2']
    const index = hierarchyOrder.indexOf(level)
    const colors = [
      'bg-gray-100 text-gray-700',
      'bg-yellow-100 text-yellow-700',
      'bg-orange-100 text-orange-700',
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700'
    ]
    return colors[index] || colors[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users, roles, and hierarchy levels</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with specified role and hierarchy level.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
                    <SelectItem value={UserRole.LEADER}>Leader</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hierarchy">Hierarchy Level</Label>
                <Select value={newUser.hierarchyLevel} onValueChange={(value) => setNewUser({ ...newUser, hierarchyLevel: value as HierarchyLevel })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={HierarchyLevel.RF1}>RF1 (Entry Level)</SelectItem>
                    <SelectItem value={HierarchyLevel.RF2}>RF2</SelectItem>
                    <SelectItem value={HierarchyLevel.RF3}>RF3</SelectItem>
                    <SelectItem value={HierarchyLevel.OF1}>OF1</SelectItem>
                    <SelectItem value={HierarchyLevel.OF2}>OF2</SelectItem>
                    <SelectItem value={HierarchyLevel.M1}>M1</SelectItem>
                    <SelectItem value={HierarchyLevel.M2}>M2 (Senior Level)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
            <SelectItem value={UserRole.LEADER}>Leader</SelectItem>
            <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hierarchyFilter} onValueChange={(value) => setHierarchyFilter(value as HierarchyLevel | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value={HierarchyLevel.RF1}>RF1</SelectItem>
            <SelectItem value={HierarchyLevel.RF2}>RF2</SelectItem>
            <SelectItem value={HierarchyLevel.RF3}>RF3</SelectItem>
            <SelectItem value={HierarchyLevel.OF1}>OF1</SelectItem>
            <SelectItem value={HierarchyLevel.OF2}>OF2</SelectItem>
            <SelectItem value={HierarchyLevel.M1}>M1</SelectItem>
            <SelectItem value={HierarchyLevel.M2}>M2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {user.name ? user.name.split(' ').map(n => n[0]).join('') : <User className="w-6 h-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getRoleColor(user.role)}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                      {user.hierarchyLevel ? (
                        <Badge className={getHierarchyColor(user.hierarchyLevel)}>
                          {user.hierarchyLevel}
                        </Badge>
                      ) : user.role === UserRole.ADMIN ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          System Access
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          No Hierarchy
                        </Badge>
                      )}
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{user._count.assignedTasks}</div>
                    <div>Assigned Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{user.teamMembers.length}</div>
                    <div>Teams</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <div>Joined</div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingUser(user)}
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
                          <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to deactivate {user.name}? This will prevent them from accessing the system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </Card>
          ))}
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

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser.name}</DialogTitle>
              <DialogDescription>
                Update user information, role, and hierarchy level.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
                    <SelectItem value={UserRole.LEADER}>Leader</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-hierarchy">Hierarchy Level</Label>
                <Select 
                  value={editingUser.hierarchyLevel || HierarchyLevel.RF1} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, hierarchyLevel: value as HierarchyLevel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={HierarchyLevel.RF1}>RF1 (Entry Level)</SelectItem>
                    <SelectItem value={HierarchyLevel.RF2}>RF2</SelectItem>
                    <SelectItem value={HierarchyLevel.RF3}>RF3</SelectItem>
                    <SelectItem value={HierarchyLevel.OF1}>OF1</SelectItem>
                    <SelectItem value={HierarchyLevel.OF2}>OF2</SelectItem>
                    <SelectItem value={HierarchyLevel.M1}>M1</SelectItem>
                    <SelectItem value={HierarchyLevel.M2}>M2 (Senior Level)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateUser(editingUser.id, {
                name: editingUser.name,
                role: editingUser.role,
                hierarchyLevel: editingUser.hierarchyLevel || undefined,
                isActive: editingUser.isActive
              })}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}