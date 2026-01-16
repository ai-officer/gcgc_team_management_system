'use client'

import { useState, useEffect } from 'react'
import { User, Users, Mail, Calendar, Edit, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationInfo } from '@/components/ui/pagination'
import { UserRole, HierarchyLevel } from '@prisma/client'

interface Member {
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

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0
  })

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams({
        role: 'MEMBER',
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setMembers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [pagination.page, debouncedSearchTerm])

  const getHierarchyColor = (level: HierarchyLevel | null) => {
    if (!level) return 'bg-gray-100 text-gray-700 border-gray-200'
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

  const getHierarchyStats = () => {
    const stats = {
      RF1: 0, RF2: 0, RF3: 0, OF1: 0, OF2: 0, M1: 0, M2: 0
    }
    members.forEach(member => {
      if (member.hierarchyLevel && member.hierarchyLevel in stats) {
        stats[member.hierarchyLevel as keyof typeof stats]++
      }
    })
    return stats
  }

  const hierarchyStats = getHierarchyStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Members Management</h1>
          <p className="text-gray-600">Manage all team members and their assignments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-700">
            {pagination.total} Members
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.filter(m => m.isActive).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.filter(m => m.teamMembers.length > 0).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.reduce((acc, m) => acc + m._count.assignedTasks, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Hierarchy Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hierarchy Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(hierarchyStats).map(([level, count]) => (
            <div key={level} className="text-center">
              <div className={`p-3 rounded-lg ${getHierarchyColor(level as HierarchyLevel)}`}>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs font-medium">{level}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Members List */}
      <div className="grid gap-4">
        {members.map((member) => (
          <Card key={member.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {member.name ? member.name.split(' ').map(n => n[0]).join('') : 'M'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">{member.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <User className="w-3 h-3 mr-1" />
                      {member.role}
                    </Badge>
                    {member.hierarchyLevel ? (
                      <Badge className={getHierarchyColor(member.hierarchyLevel)}>
                        {member.hierarchyLevel}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        No Hierarchy
                      </Badge>
                    )}
                    <Badge variant={member.isActive ? "default" : "secondary"}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{member.teamMembers.length}</div>
                  <div>Teams</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{member._count.assignedTasks}</div>
                  <div>Tasks</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </div>
                  <div>Joined</div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Team Memberships */}
            {member.teamMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Team Memberships:</p>
                <div className="flex flex-wrap gap-2">
                  {member.teamMembers.map((tm, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-50">
                      {tm.team.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

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

      {members.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No members found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No members match your search criteria.' : 'There are no members in the system yet.'}
          </p>
        </div>
      )}
    </div>
  )
}