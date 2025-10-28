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
        {/* Skeleton Loader - Clean & Minimalistic */}
        <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl animate-pulse border border-border/40" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse border-border/40">
              <CardContent className="p-6">
                <div className="h-3 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-7 bg-slate-100 rounded w-1/2" />
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
      <div className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50/50 transition-colors group border border-transparent hover:border-border/40">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
            {isEditing ? (
              <Input
                type={type}
                value={value}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, [field]: e.target.value }))}
                className="mt-1 h-9 border-border/40 focus:border-primary"
                autoFocus
              />
            ) : (
              <p className="font-medium text-sm mt-0.5">{value || 'Not set'}</p>
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
      {/* Hero Header with Cover - Clean & Minimalistic */}
      <Card className="overflow-hidden border border-border/40 shadow-sm">
        <div className="h-32 sm:h-48 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.04),transparent_50%)]" />
        </div>
        <CardContent className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg ring-1 ring-black/5">
                <AvatarImage src={profile.image} alt={profile.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-slate-600 to-slate-700 text-white font-medium">
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
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{profile.name}</h1>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 font-medium">
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.role}
                  </Badge>
                  {profile.isLeader && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
                      <Award className="h-3 w-3 mr-1" />
                      Team Leader
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 font-medium">
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
                variant="secondary"
                className={profile.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}
              >
                <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${profile.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {profile.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats - Clean & Minimalistic */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/40 hover:border-border transition-all hover:shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Department</p>
                <p className="text-2xl font-semibold text-foreground">{profile.department || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:border-border transition-all hover:shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Team</p>
                <p className="text-2xl font-semibold text-foreground">{profile.team || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <User className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:border-border transition-all hover:shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Hierarchy Level</p>
                <p className="text-2xl font-semibold text-foreground">{profile.hierarchyLevel || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <TrendingUp className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:border-border transition-all hover:shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Job Level</p>
                <p className="text-2xl font-semibold text-foreground">{profile.jobLevel || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Award className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content - Modern Design */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-50/50 p-1 border border-border/40">
          <TabsTrigger
            value="personal"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal Info</span>
            <span className="sm:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger
            value="organization"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
            <span className="sm:hidden">Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-muted-foreground" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-sm">
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
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Organizational Structure
              </CardTitle>
              <CardDescription className="text-sm">
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
                <div className="mt-4 p-4 bg-slate-50/50 rounded-lg border border-border/40">
                  <Label className="text-xs text-muted-foreground font-medium mb-2 block">Full Organizational Path</Label>
                  <p className="text-sm font-mono text-slate-700">{profile.organizationalPath}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Account Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Account credentials and security information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <InlineEditField field="email" label="Email Address" icon={Mail} type="email" editable={false} />
              <InlineEditField field="username" label="Username" icon={User} editable={false} />

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 border border-border/40 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-slate-100">
                      <Calendar className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground font-medium">Account Created</Label>
                      <p className="font-medium text-sm mt-0.5">{format(new Date(profile.createdAt), 'PPP')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 border border-border/40 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-slate-100">
                      <Clock className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground font-medium">Last Updated</Label>
                      <p className="font-medium text-sm mt-0.5">{format(new Date(profile.updatedAt), 'PPP')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 border border-border/40 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-slate-100">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground font-medium">Account Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${profile.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <p className="font-medium text-sm">{profile.isActive ? 'Active' : 'Inactive'}</p>
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
