'use client'

import { useState, useEffect } from 'react'
import { Users, ArrowUpRight, ArrowDownRight, Crown, Shield, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { HierarchyLevel } from '@prisma/client'

interface HierarchyUser {
  id: string
  name: string
  email: string
  image: string | null
  hierarchyLevel: HierarchyLevel | null
  teamMembers: Array<{
    team: {
      name: string
    }
  }>
}

interface HierarchyLevelData {
  level: HierarchyLevel
  count: number
  users: HierarchyUser[]
}

interface HierarchyData {
  hierarchyLevels: HierarchyLevelData[]
}

export default function AdminHierarchyPage() {
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [targetLevel, setTargetLevel] = useState<HierarchyLevel>(HierarchyLevel.RF1)
  const [action, setAction] = useState<'promote' | 'demote' | 'assign'>('promote')

  const fetchHierarchyData = async () => {
    try {
      const response = await fetch('/api/admin/hierarchy')
      const data = await response.json()

      if (response.ok) {
        setHierarchyData(data)
      }
    } catch (error) {
      console.error('Error fetching hierarchy data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHierarchyData()
  }, [])

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) return

    try {
      const response = await fetch('/api/admin/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          targetLevel,
          action
        })
      })

      if (response.ok) {
        fetchHierarchyData()
        setSelectedUsers([])
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const getHierarchyIcon = (level: HierarchyLevel) => {
    const hierarchyOrder = [HierarchyLevel.RF1, HierarchyLevel.RF2, HierarchyLevel.RF3, HierarchyLevel.OF1, HierarchyLevel.OF2, HierarchyLevel.M1, HierarchyLevel.M2]
    const index = hierarchyOrder.indexOf(level)

    if (index >= 5) return <Crown className="w-4 h-4" />
    if (index >= 3) return <Shield className="w-4 h-4" />
    return <Star className="w-4 h-4" />
  }

  const getHierarchyColor = (level: HierarchyLevel) => {
    const hierarchyOrder = [HierarchyLevel.RF1, HierarchyLevel.RF2, HierarchyLevel.RF3, HierarchyLevel.OF1, HierarchyLevel.OF2, HierarchyLevel.M1, HierarchyLevel.M2]
    const index = hierarchyOrder.indexOf(level)
    const colors = [
      'bg-slate-50 text-slate-700 border border-slate-200',
      'bg-amber-50 text-amber-700 border border-amber-200',
      'bg-orange-50 text-orange-700 border border-orange-200',
      'bg-blue-50 text-blue-700 border border-blue-200',
      'bg-indigo-50 text-indigo-700 border border-indigo-200',
      'bg-purple-50 text-purple-700 border border-purple-200',
      'bg-pink-50 text-pink-700 border border-pink-200'
    ]
    return colors[index] || colors[0]
  }

  const getHierarchyDescription = (level: HierarchyLevel) => {
    const descriptions = {
      [HierarchyLevel.RF1]: 'Entry Level - Recent graduates and new hires',
      [HierarchyLevel.RF2]: 'Junior Level - 1-2 years experience',
      [HierarchyLevel.RF3]: 'Intermediate Level - 2-4 years experience',
      [HierarchyLevel.OF1]: 'Senior Level - 4-6 years experience',
      [HierarchyLevel.OF2]: 'Lead Level - 6-8 years experience',
      [HierarchyLevel.M1]: 'Manager Level - 8+ years experience',
      [HierarchyLevel.M2]: 'Senior Manager - 10+ years experience'
    }
    return descriptions[level]
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hierarchyData) {
    return <div className="bg-gray-50 p-6 text-center py-8 text-sm text-gray-500">Error loading hierarchy data</div>
  }

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hierarchy Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage organizational hierarchy and user promotions</p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.length} users selected
              </span>
              <Select value={action} onValueChange={(value) => setAction(value as typeof action)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promote">
                    <div className="flex items-center">
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Promote
                    </div>
                  </SelectItem>
                  <SelectItem value="demote">
                    <div className="flex items-center">
                      <ArrowDownRight className="w-4 h-4 mr-2" />
                      Demote
                    </div>
                  </SelectItem>
                  <SelectItem value="assign">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Assign Level
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {(action === 'promote' || action === 'assign') && (
                <Select value={targetLevel} onValueChange={(value) => setTargetLevel(value as HierarchyLevel)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={HierarchyLevel.RF1}>RF1</SelectItem>
                    <SelectItem value={HierarchyLevel.RF2}>RF2</SelectItem>
                    <SelectItem value={HierarchyLevel.RF3}>RF3</SelectItem>
                    <SelectItem value={HierarchyLevel.OF1}>OF1</SelectItem>
                    <SelectItem value={HierarchyLevel.OF2}>OF2</SelectItem>
                    <SelectItem value={HierarchyLevel.M1}>M1</SelectItem>
                    <SelectItem value={HierarchyLevel.M2}>M2</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setSelectedUsers([])}>
                Cancel
              </Button>
              <Button onClick={handleBulkAction} className="bg-blue-600 hover:bg-blue-700">
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {hierarchyData.hierarchyLevels.map((levelData) => (
          <div key={levelData.level} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getHierarchyIcon(levelData.level)}
                <span className="text-lg font-semibold text-gray-900">{levelData.level}</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getHierarchyColor(levelData.level)}`}>
                {levelData.count} users
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{getHierarchyDescription(levelData.level)}</p>

            <div className="space-y-2">
              {levelData.users.slice(0, 3).map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />
                  <Avatar className="h-7 w-7 rounded-lg ring-1 ring-gray-200 flex-shrink-0">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                      {user.name
                        ? user.name.split(' ').map(n => n[0]).join('')
                        : user.email?.[0]?.toUpperCase() || '?'
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.teamMembers.length > 0
                        ? user.teamMembers.map(tm => tm.team.name).join(', ')
                        : 'No team assigned'
                      }
                    </p>
                  </div>
                </div>
              ))}
              {levelData.users.length > 3 && (
                <p className="text-xs text-gray-400 text-center pt-1 border-t border-gray-100">
                  +{levelData.users.length - 3} more users
                </p>
              )}
              {levelData.users.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-3">No users at this level</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed User List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">All Users by Hierarchy</h2>
          <p className="text-sm text-gray-500 mt-0.5">Complete list of users organized by hierarchy level</p>
        </div>
        <div className="p-5 space-y-6">
          {hierarchyData.hierarchyLevels.map((levelData) => (
            <div key={levelData.level}>
              <div className="flex items-center gap-2 mb-3">
                {getHierarchyIcon(levelData.level)}
                <h3 className="text-sm font-semibold text-gray-900">{levelData.level}</h3>
                <Badge className={`${getHierarchyColor(levelData.level)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                  {levelData.count}
                </Badge>
              </div>
              {levelData.users.length > 0 ? (
                <div className="space-y-2">
                  {levelData.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback className="bg-blue-50 text-blue-700 text-sm font-medium">
                            {user.name ? user.name.split(' ').map(n => n[0]).join('') : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {user.teamMembers.length > 0 && (
                          <>
                            {user.teamMembers.slice(0, 2).map((tm, index) => (
                              <span key={index} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                                {tm.team.name}
                              </span>
                            ))}
                            {user.teamMembers.length > 2 && (
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                                +{user.teamMembers.length - 2}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No users at {levelData.level} level
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
