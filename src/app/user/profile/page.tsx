'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { User, Mail, Phone, Building2, Briefcase, Calendar, Shield, Edit2, Save, X, CheckCircle, AlertCircle, Camera } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
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

  const handleEditToggle = () => {
    if (editing) {
      setEditedProfile(profile || {})
    }
    setEditing(!editing)
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setSaving(true)
      const response = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: editedProfile.firstName,
          lastName: editedProfile.lastName,
          middleName: editedProfile.middleName,
          contactNumber: editedProfile.contactNumber,
          positionTitle: editedProfile.positionTitle,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setEditedProfile(updatedProfile)
      setEditing(false)
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (err) {
      console.error('Error updating profile:', err)
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!file) return

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const data = await response.json()
      
      // Update profile state with new image URL
      setProfile(prev => prev ? { ...prev, image: data.imageUrl } : null)
      
      // Update session to reflect new profile picture
      await updateSession({ 
        trigger: 'update',
        user: { ...session?.user, image: data.imageUrl }
      })
      
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been successfully updated.",
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const triggerImageUpload = () => {
    fileInputRef.current?.click()
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return email ? email[0].toUpperCase() : 'U'
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-700 border-red-200'
      case 'LEADER': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'MEMBER': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Profile not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditToggle}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card className="card-modern">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4 relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.image} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-lg">
                    {getInitials(profile.name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={triggerImageUpload}
                  disabled={uploadingImage}
                  title="Change profile picture"
                >
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file)
                    }
                  }}
                />
              </div>
              <CardTitle className="text-xl">
                {profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unnamed User'}
              </CardTitle>
              <CardDescription>
                {profile.positionTitle || 'Team Member'}
              </CardDescription>
              <div className="flex justify-center mt-3">
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {profile.role}
                  {profile.isLeader && profile.role !== 'ADMIN' && ' • Leader'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground truncate">{profile.email}</span>
              </div>
              {profile.contactNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile.contactNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {format(new Date(profile.createdAt), 'MMM yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  {editing ? (
                    <Input
                      id="firstName"
                      value={editedProfile.firstName || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md text-sm">
                      {profile.firstName || 'Not provided'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  {editing ? (
                    <Input
                      id="lastName"
                      value={editedProfile.lastName || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md text-sm">
                      {profile.lastName || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  {editing ? (
                    <Input
                      id="middleName"
                      value={editedProfile.middleName || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, middleName: e.target.value })}
                      placeholder="Enter middle name"
                    />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md text-sm">
                      {profile.middleName || 'Not provided'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  {editing ? (
                    <Input
                      id="contactNumber"
                      value={editedProfile.contactNumber || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, contactNumber: e.target.value })}
                      placeholder="Enter contact number"
                    />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md text-sm">
                      {profile.contactNumber || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="positionTitle">Position Title</Label>
                {editing ? (
                  <Input
                    id="positionTitle"
                    value={editedProfile.positionTitle || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, positionTitle: e.target.value })}
                    placeholder="Enter position title"
                  />
                ) : (
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.positionTitle || 'Not provided'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organizational Information */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizational Information
              </CardTitle>
              <CardDescription>
                Your position within the organization structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Division</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.division || 'Not assigned'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.department || 'Not assigned'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.section || 'Not assigned'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Team</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.team || 'Not assigned'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Level</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.jobLevel || 'Not assigned'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hierarchy Level</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.hierarchyLevel || 'Not assigned'}
                  </div>
                </div>
              </div>
              {profile.organizationalPath && (
                <div className="space-y-2">
                  <Label>Organizational Path</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.organizationalPath}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Account details and security information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {profile.username || 'Not set'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {format(new Date(profile.createdAt), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    {format(new Date(profile.updatedAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
