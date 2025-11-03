'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Database, Users, Shield, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'

interface AdminSettings {
  id: string
  systemName: string
  systemDescription?: string
  allowUserRegistration: boolean
  requireEmailVerification: boolean
  defaultUserRole: string
  defaultHierarchyLevel: string
  sessionTimeout: number // minutes
  maxLoginAttempts: number
  enableNotifications: boolean
  enableAuditLogging: boolean
  maintenanceMode: boolean
  maintenanceMessage?: string
  createdAt: string
  updatedAt: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (response.ok) {
        setSettings(data.settings)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to fetch settings'
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch settings'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Settings updated successfully'
        })
        setSettings(data.settings)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update settings'
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No Settings Found</h3>
        <p className="text-gray-500">Settings will be initialized on first save.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Settings</h1>
          <p className="text-sm font-medium text-slate-600">Configure system-wide settings and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* System Settings */}
        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Database className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900">System Configuration</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-slate-600 mt-1">
              Basic system settings and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="systemName">System Name</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => updateSetting('systemName', e.target.value)}
                  placeholder="Enter system name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value) || 60)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemDescription">System Description</Label>
              <Textarea
                id="systemDescription"
                value={settings.systemDescription || ''}
                onChange={(e) => updateSetting('systemDescription', e.target.value)}
                placeholder="Enter system description (optional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* User Management Settings */}
        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900">User Management</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-slate-600 mt-1">
              Configure user registration and default settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow User Registration</Label>
                <p className="text-sm text-gray-500">Allow users to register new accounts</p>
              </div>
              <Switch
                checked={settings.allowUserRegistration}
                onCheckedChange={(checked) => updateSetting('allowUserRegistration', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Email Verification</Label>
                <p className="text-sm text-gray-500">Users must verify email before accessing system</p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => updateSetting('requireEmailVerification', checked)}
              />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultUserRole">Default User Role</Label>
                <Select 
                  value={settings.defaultUserRole} 
                  onValueChange={(value) => updateSetting('defaultUserRole', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="LEADER">Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultHierarchyLevel">Default Hierarchy Level</Label>
                <Select 
                  value={settings.defaultHierarchyLevel} 
                  onValueChange={(value) => updateSetting('defaultHierarchyLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RF1">RF1 (Entry Level)</SelectItem>
                    <SelectItem value="RF2">RF2</SelectItem>
                    <SelectItem value="RF3">RF3</SelectItem>
                    <SelectItem value="OF1">OF1</SelectItem>
                    <SelectItem value="OF2">OF2</SelectItem>
                    <SelectItem value="M1">M1</SelectItem>
                    <SelectItem value="M2">M2 (Senior Level)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900">Security & Monitoring</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-slate-600 mt-1">
              Security policies and system monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Maximum Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="1"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value) || 3)}
              />
              <p className="text-sm text-gray-500">Account will be locked after this many failed attempts</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Audit Logging</Label>
                <p className="text-sm text-gray-500">Log all administrative actions for security</p>
              </div>
              <Switch
                checked={settings.enableAuditLogging}
                onCheckedChange={(checked) => updateSetting('enableAuditLogging', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Bell className="w-4 h-4 text-purple-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900">Notifications</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-slate-600 mt-1">
              System notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable System Notifications</Label>
                <p className="text-sm text-gray-500">Allow system to send notifications to users</p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Settings className="w-4 h-4 text-amber-700" />
              </div>
              <CardTitle className="text-lg font-semibold text-amber-900">Maintenance Mode</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-amber-700 mt-1">
              System maintenance and downtime settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Maintenance Mode</Label>
                <p className="text-sm text-gray-500">Prevent users from accessing the system</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
              />
            </div>
            
            {settings.maintenanceMode && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                  <Textarea
                    id="maintenanceMessage"
                    value={settings.maintenanceMessage || ''}
                    onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                    placeholder="Message to display to users during maintenance"
                    rows={3}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button at Bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  )
}