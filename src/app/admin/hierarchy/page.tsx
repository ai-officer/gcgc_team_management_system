'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight, Crown, Shield, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      'bg-gray-100 text-gray-700 border-gray-200',
      'bg-yellow-100 text-yellow-700 border-yellow-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-pink-100 text-pink-700 border-pink-200'
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hierarchyData) {
    return <div className="text-center py-8">Error loading hierarchy data</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hierarchy Management</h1>
          <p className="text-gray-600">Manage organizational hierarchy and user promotions</p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
      )}

      {/* Hierarchy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {hierarchyData.hierarchyLevels.map((levelData) => (
          <Card key={levelData.level} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getHierarchyIcon(levelData.level)}
                  <CardTitle className="text-lg">{levelData.level}</CardTitle>
                </div>
                <Badge className={getHierarchyColor(levelData.level)}>
                  {levelData.count} users
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {getHierarchyDescription(levelData.level)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {levelData.users.slice(0, 3).map((user) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                        {user.name 
                          ? user.name.split(' ').map(n => n[0]).join('') 
                          : user.email?.[0]?.toUpperCase() || '?'
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
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
                  <div className="text-xs text-gray-500 text-center pt-2 border-t">
                    +{levelData.users.length - 3} more users
                  </div>
                )}
                {levelData.users.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No users at this level
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed User List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users by Hierarchy</CardTitle>
          <CardDescription>Complete list of users organized by hierarchy level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {hierarchyData.hierarchyLevels.map((levelData) => (
              <div key={levelData.level}>
                <div className="flex items-center space-x-2 mb-3">
                  {getHierarchyIcon(levelData.level)}
                  <h3 className="text-lg font-semibold text-gray-900">{levelData.level}</h3>
                  <Badge className={getHierarchyColor(levelData.level)}>
                    {levelData.count}
                  </Badge>
                </div>
                {levelData.users.length > 0 ? (
                  <div className="grid gap-3">
                    {levelData.users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {user.name ? user.name.split(' ').map(n => n[0]).join('') : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {user.teamMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {user.teamMembers.slice(0, 2).map((tm, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tm.team.name}
                                </Badge>
                              ))}
                              {user.teamMembers.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.teamMembers.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No users at {levelData.level} level
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}