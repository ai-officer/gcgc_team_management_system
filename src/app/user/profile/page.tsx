'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, Shield,
  CheckCircle, AlertCircle, Camera,
  Clock, Award, TrendingUp, Activity, Eye, EyeOff, Lock, Edit2, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { avatarEvents } from '@/lib/avatar-events'

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

  // Change password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

      // Update the session with new image - this will trigger JWT callback with trigger='update'
      await updateSession({
        user: {
          image: data.imageUrl
        }
      })

      // Emit event to sync avatar across all components (sidebar, etc.)
      avatarEvents.emit(data.imageUrl)

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
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all password fields',
        variant: 'destructive',
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'New password must be at least 8 characters',
        variant: 'destructive',
      })
      return
    }

    try {
      setChangingPassword(true)
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      toast({
        title: 'Success',
        description: 'Your password has been changed successfully',
      })

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
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
      <div className="bg-gray-50 p-6 space-y-6 max-w-4xl mx-auto">
        <div className="space-y-1">
          <div className="h-8 bg-gray-200 rounded-lg w-40 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-lg w-64 animate-pulse" />
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="h-24 bg-gray-200 rounded-full w-24 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="bg-gray-50 p-6 max-w-4xl mx-auto flex items-center justify-center h-96">
        <Card className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Profile</h3>
            <p className="text-sm text-gray-600">{error || 'Failed to load profile data'}</p>
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
      <div className="flex items-center justify-between py-3 group">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-gray-100 mt-0.5 shrink-0">
            <Icon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</Label>
            {isEditing ? (
              <Input
                type={type}
                value={value}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, [field]: e.target.value }))}
                className="mt-1 h-9 rounded-lg border-gray-200 focus:border-blue-500 text-sm"
                autoFocus
              />
            ) : (
              <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value || <span className="text-gray-400 font-normal">Not set</span>}</p>
            )}
          </div>
        </div>
        {editable && (
          <div className="flex gap-1 shrink-0 ml-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFieldSave(field)}
                  disabled={saving}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFieldCancel(field)}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFieldEdit(field)}
                className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="h-4 w-4 text-gray-400" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 space-y-6 max-w-4xl mx-auto">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-600 mt-1">Keep your profile information up to date</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Department</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{profile.department || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Team</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{profile.team || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Job Level</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{profile.jobLevel || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Hierarchy</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{profile.hierarchyLevel || 'N/A'}</p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">

          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center mb-8 lg:mb-0">
            <div className="relative group">
              <Avatar
                key={profile.image || 'no-image'}
                className="h-24 w-24 ring-2 ring-gray-100"
              >
                <AvatarImage
                  key={profile.image || 'no-image-src'}
                  src={profile.image || undefined}
                  alt={profile.name}
                />
                <AvatarFallback className="text-xl bg-blue-50 text-blue-600 font-bold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
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

            <p className="text-lg font-semibold text-gray-900 mt-3">{profile.name || 'Unknown'}</p>
            <p className="text-sm text-gray-600 mt-0.5">{profile.positionTitle || 'No position title'}</p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium rounded-md text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {profile.role}
              </Badge>
              {profile.isLeader && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 font-medium rounded-md text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  Team Leader
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={profile.isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-medium rounded-md text-xs'
                  : 'bg-gray-100 text-gray-600 border-gray-200 font-medium rounded-md text-xs'
                }
              >
                <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${profile.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {profile.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="mt-4 rounded-lg border-gray-200 text-gray-600 hover:text-gray-900 text-xs"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Change Photo
            </Button>

            <div className="mt-6 w-full pt-6 border-t border-gray-100 text-left space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              {profile.contactNumber && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{profile.contactNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span>Joined {format(new Date(profile.createdAt), 'MMM yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Information */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Personal Information</p>
              <Separator className="mb-4" />
              <div className="space-y-1 divide-y divide-gray-50">
                <InlineEditField field="firstName" label="First Name" icon={User} editable={false} />
                <InlineEditField field="lastName" label="Last Name" icon={User} editable={false} />
                <InlineEditField field="middleName" label="Middle Name" icon={User} editable={false} />
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Contact</p>
              <Separator className="mb-4" />
              <div className="space-y-1 divide-y divide-gray-50">
                <InlineEditField field="contactNumber" label="Phone Number" icon={Phone} type="tel" editable={false} />
              </div>
            </div>

            {/* Organizational */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Organizational</p>
              <Separator className="mb-4" />
              <div className="space-y-1 divide-y divide-gray-50">
                <InlineEditField field="positionTitle" label="Position Title" icon={Briefcase} editable={false} />
                <InlineEditField field="division" label="Division" icon={Building2} editable={false} />
                <InlineEditField field="department" label="Department" icon={Building2} editable={false} />
                <InlineEditField field="section" label="Section" icon={Building2} editable={false} />
                <InlineEditField field="team" label="Team" icon={User} editable={false} />
              </div>
              {profile.organizationalPath && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <Label className="text-xs text-gray-500 font-medium mb-1.5 block">Full Organizational Path</Label>
                  <p className="text-sm font-mono text-gray-700">{profile.organizationalPath}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Account Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Account Settings</h2>
        <p className="text-sm text-gray-600 mb-4">Account credentials and security information</p>
        <Separator className="mb-4" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="p-2 rounded-lg bg-white border border-gray-200 shrink-0">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Created</Label>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{format(new Date(profile.createdAt), 'PPP')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="p-2 rounded-lg bg-white border border-gray-200 shrink-0">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</Label>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{format(new Date(profile.updatedAt), 'PPP')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="p-2 rounded-lg bg-white border border-gray-200 shrink-0">
              <Activity className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Status</Label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`h-1.5 w-1.5 rounded-full ${profile.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                <p className="text-sm font-medium text-gray-900">{profile.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 divide-y divide-gray-50">
          <InlineEditField field="email" label="Email Address" icon={Mail} type="email" editable={false} />
          <InlineEditField field="username" label="Username" icon={User} editable={false} />
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-red-50 rounded-lg">
            <Lock className="h-4 w-4 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4 ml-11">Update your password to keep your account secure</p>
        <Separator className="mb-6" />

        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                className="pr-10 rounded-lg border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                className="pr-10 rounded-lg border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Must be at least 8 characters with uppercase, lowercase, and a number</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="pr-10 rounded-lg border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Passwords do not match
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                setShowCurrentPassword(false)
                setShowNewPassword(false)
                setShowConfirmPassword(false)
              }}
              disabled={changingPassword}
              className="rounded-lg border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              {changingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
