'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, Shield,
  Edit2, Save, X, CheckCircle, AlertCircle, Camera, MapPin,
  Clock, Award, TrendingUp, Activity, Settings, Eye, EyeOff
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface UserProfile {
  id: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  middleName?: string
  name?: string
  contactNumber?: string
  image?: string
  role: string
  hierarchyLevel?: string
  division?: string
  department?: string
  section?: string
  team?: string
  positionTitle?: string
  jobLevel?: string
  organizationalPath?: string
  isLeader: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function UserProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session?.user) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${session.user.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch profile data')
        }
        const data = await response.json()
        setProfile(data)
        setEditedProfile(data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session])

  const handleFieldEdit = (field: string) => {
    setEditingField(field)
  }

  const handleFieldSave = async (field: string) => {
    if (!profile) return

    try {
      setSaving(true)
      const response = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: editedProfile[field as keyof UserProfile],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedData = await response.json()
      setProfile(updatedData.user)
      setEditedProfile(updatedData.user)
      setEditingField(null)

      // Update session if name changed
      if (field === 'firstName' || field === 'lastName') {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: `${updatedData.user.firstName || ''} ${updatedData.user.lastName || ''}`.trim()
          }
        })
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (err) {
      console.error('Error updating profile:', err)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFieldCancel = (field: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: profile?.[field as keyof UserProfile]
    }))
    setEditingField(null)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', profile.id)

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()

      setProfile(prev => prev ? { ...prev, image: data.imageUrl } : null)

      await updateSession({
        ...session,
        user: {
          ...session?.user,
          image: data.imageUrl
        }
      })

      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      })
    } catch (err) {
      console.error('Error uploading image:', err)
      toast({
        title: 'Error',
        description: 'Failed to upload profile picture',
        variant: 'destructive',
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'LEADER': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'MEMBER': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Loader */}
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl animate-pulse" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Profile</h3>
            <p className="text-muted-foreground">{error || 'Failed to load profile data'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const InlineEditField = ({
    field,
    label,
    icon: Icon,
    type = 'text',
    editable = true
  }: {
    field: keyof UserProfile
    label: string
    icon: any
    type?: string
    editable?: boolean
  }) => {
    const isEditing = editingField === field
    const value = editedProfile[field] as string || ''

    return (
      <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {isEditing ? (
              <Input
                type={type}
                value={value}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, [field]: e.target.value }))}
                className="mt-1 h-8"
                autoFocus
              />
            ) : (
              <p className="font-medium">{value || 'Not set'}</p>
            )}
          </div>
        </div>
        {editable && (
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFieldSave(field)}
                  disabled={saving}
                  className="h-8 w-8 p-0"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFieldCancel(field)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFieldEdit(field)}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Header with Cover */}
      <Card className="overflow-hidden border-none shadow-lg">
        <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-grid-white/10" />
        </div>
        <CardContent className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={profile.image} alt={profile.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold">{profile.name}</h1>
                <Badge variant="outline" className={getRoleBadgeColor(profile.role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role}
                </Badge>
                {profile.isLeader && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                    <Award className="h-3 w-3 mr-1" />
                    Team Leader
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                <Briefcase className="h-4 w-4" />
                {profile.positionTitle || 'No position title'}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
                {profile.contactNumber && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {profile.contactNumber}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {format(new Date(profile.createdAt), 'MMM yyyy')}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge
                variant={profile.isActive ? 'default' : 'secondary'}
                className={profile.isActive ? 'bg-green-100 text-green-800 border-green-200' : ''}
              >
                <div className={`h-2 w-2 rounded-full mr-1 ${profile.isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
                {profile.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="text-2xl font-bold">{profile.department || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team</p>
                <p className="text-2xl font-bold">{profile.team || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hierarchy Level</p>
                <p className="text-2xl font-bold">{profile.hierarchyLevel || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Job Level</p>
                <p className="text-2xl font-bold">{profile.jobLevel || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Click on any field to edit. Changes are saved immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <InlineEditField field="firstName" label="First Name" icon={User} />
              <InlineEditField field="lastName" label="Last Name" icon={User} />
              <InlineEditField field="middleName" label="Middle Name" icon={User} />
              <InlineEditField field="contactNumber" label="Contact Number" icon={Phone} type="tel" />
              <InlineEditField field="positionTitle" label="Position Title" icon={Briefcase} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizational Structure
              </CardTitle>
              <CardDescription>
                Your position within the organizational hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <InlineEditField field="division" label="Division" icon={Building2} editable={false} />
              <InlineEditField field="department" label="Department" icon={Building2} editable={false} />
              <InlineEditField field="section" label="Section" icon={Building2} editable={false} />
              <InlineEditField field="team" label="Team" icon={User} editable={false} />
              <Separator className="my-4" />
              <InlineEditField field="jobLevel" label="Job Level" icon={Award} editable={false} />
              <InlineEditField field="hierarchyLevel" label="Hierarchy Level" icon={TrendingUp} editable={false} />

              {profile.organizationalPath && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">Full Organizational Path</Label>
                  <p className="text-sm font-mono">{profile.organizationalPath}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Account credentials and security information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <InlineEditField field="email" label="Email Address" icon={Mail} type="email" editable={false} />
              <InlineEditField field="username" label="Username" icon={User} editable={false} />

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Account Created</Label>
                      <p className="font-medium">{format(new Date(profile.createdAt), 'PPP')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Updated</Label>
                      <p className="font-medium">{format(new Date(profile.updatedAt), 'PPP')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Account Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-2 w-2 rounded-full ${profile.isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
                        <p className="font-medium">{profile.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
