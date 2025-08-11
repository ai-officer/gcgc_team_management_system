'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Calendar,
  AlertCircle,
  CheckSquare,
  Clock,
  UserCheck,
  Plus,
  ArrowRight,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import MemberProfileModal from '@/components/shared/MemberProfileModal'

interface TeamMember {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  image?: string
  role: string
  hierarchyLevel?: string
  contactNumber?: string
  positionTitle?: string
  isActive: boolean
  createdAt: string
  reportsToId: string | null
  _count?: {
    assignedTasks: number
  }
}

interface TeamStats {
  totalMembers: number
  activeTasks: number
  completedTasks: number
  overdueTasks: number
}

export default function TeamOverviewPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  
  // Enhanced member addition states
  const [addMemberMode, setAddMemberMode] = useState<'select' | 'create' | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedUserForPreview, setSelectedUserForPreview] = useState<TeamMember | null>(null)
  // Wizard step state for create user form
  const [createUserStep, setCreateUserStep] = useState<'group-setup' | 'personal-info' | 'contact-info' | 'position-info'>('group-setup')
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    firstName: '',
    lastName: '',
    middleName: '',
    username: '',
    contactNumber: '',
    positionTitle: '',
    shortName: '',
    division: '',
    department: '',
    section: '',
    team: '',
    jobLevel: '',
    password: '',
    sectorHeadInitials: ''
  })
  // Organizational structure state with full type definitions
  const [divisions, setDivisions] = useState<Array<{id: string; name: string; code?: string; requiresSectorHead?: boolean; disabled?: boolean; children?: any[]}>>([])
  const [departments, setDepartments] = useState<Array<{id: string; name: string; code?: string; allowsCustomInput?: boolean; requiresSectionInput?: boolean; requiresTeamLabel?: boolean; disabled?: boolean; children?: any[]}>>([])
  const [sections, setSections] = useState<Array<{id: string; name: string; code?: string; disabled?: boolean}>>([])
  const [hotels, setHotels] = useState<Array<{id: string; name: string; code?: string}>>([])
  const [sectorHeads, setSectorHeads] = useState<Array<{id: string; name: string; initials: string; fullName: string; label: string}>>([])
  const [jobLevels, setJobLevels] = useState<Array<{name: string; description: string | null; order: number}>>([])
  const [teams, setTeams] = useState<Array<{id: string; name: string; code?: string; type: string}>>([])
  
  // Selected organization units
  const [selectedDivision, setSelectedDivision] = useState<{id: string; name: string; code?: string; requiresSectorHead?: boolean; disabled?: boolean; children?: any[]} | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<{id: string; name: string; code?: string; allowsCustomInput?: boolean; requiresSectionInput?: boolean; requiresTeamLabel?: boolean; disabled?: boolean; children?: any[]} | null>(null)
  const [selectedSection, setSelectedSection] = useState<{id: string; name: string; code?: string; disabled?: boolean} | null>(null)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [showOtherInputs, setShowOtherInputs] = useState({
    division: false,
    department: false,
    section: false,
    hotel: false
  })
  const [selectedSectorHead, setSelectedSectorHead] = useState('')
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedMemberIdForProfile, setSelectedMemberIdForProfile] = useState<string | null>(null)

  // Redirect if not a leader
  useEffect(() => {
    if (session?.user?.role !== 'LEADER') {
      window.location.href = '/user/dashboard'
      return
    }
  }, [session])

  useEffect(() => {
    if (!session?.user || session.user.role !== 'LEADER') return

    const fetchTeamData = async () => {
      try {
        setLoading(true)
        
        // Fetch team members (users who report to this leader)
        const membersResponse = await fetch(`/api/user/team-members`)
        if (!membersResponse.ok) {
          throw new Error('Failed to fetch team members')
        }
        const membersData = await membersResponse.json()
        setTeamMembers(membersData.members || [])
        setTeamStats(membersData.stats || null)

        // Fetch available users to add to team
        const usersResponse = await fetch('/api/users/available-for-team')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setAvailableUsers(usersData.users || [])
        }
      } catch (err) {
        console.error('Error fetching team data:', err)
        setError('Failed to load team data')
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [session])

  // Fetch organizational data when create mode is selected
  useEffect(() => {
    if (addMemberMode === 'create') {
      fetchOrganizationalData()
      setShowLivePreview(true)
    }
  }, [addMemberMode])

  // Live preview effect - update preview when form data changes
  useEffect(() => {
    if (addMemberMode === 'create' && showLivePreview) {
      // Create a preview user object from current form data
      // Combine firstName and lastName into name for display
      const fullName = [newUserData.firstName, newUserData.lastName].filter(Boolean).join(' ').trim()
      
      const previewUser = {
        ...newUserData,
        id: 'temp-preview-id',
        name: fullName || 'Enter name...', // Use combined name or placeholder
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date().toISOString(),
        reportsToId: session?.user?.id || null
      }
      setSelectedUserForPreview(previewUser as any)
      setShowPreview(true)
    }
  }, [newUserData, addMemberMode, showLivePreview, session?.user?.id])

  const fetchOrganizationalData = async () => {
    try {
      // Fetch divisions dynamically
      const divisionsResponse = await fetch('/api/organizational-units?level=1&includeInactive=true')
      if (divisionsResponse.ok) {
        const divisionsData = await divisionsResponse.json()
        setDivisions(divisionsData.data || [])
      }
      
      // Fetch sector heads dynamically
      const sectorHeadsResponse = await fetch('/api/sector-heads?includeInactive=true')
      if (sectorHeadsResponse.ok) {
        const sectorHeadsData = await sectorHeadsResponse.json()
        setSectorHeads(sectorHeadsData.data || [])
      }
      
      // Fetch job levels dynamically
      const jobLevelsResponse = await fetch('/api/job-levels?includeInactive=true')
      if (jobLevelsResponse.ok) {
        const jobLevelsData = await jobLevelsResponse.json()
        setJobLevels(jobLevelsData.data || [])
      }
    } catch (error) {
      console.error('Error fetching organizational data:', error)
    }
  }

  const handleDivisionChange = async (divisionId: string) => {
    const division = divisions.find(d => d.id === divisionId)
    if (!division) return

    setSelectedDivision(division)
    setSelectedDepartment(null)
    setSelectedSection(null)
    setDepartments([])
    setSections([])
    setTeams([])
    setHotels([])
    setSelectedSectorHead('')
    
    // Reset dependent form fields
    setNewUserData(prev => ({
      ...prev,
      division: division.name,
      department: '',
      section: '',
      team: '',
      sectorHeadInitials: ''
    }))

    // Handle special cases
    if (division.name === 'Other') {
      setShowOtherInputs(prev => ({ ...prev, division: true }))
      return
    } else {
      setShowOtherInputs(prev => ({ ...prev, division: false }))
    }

    // Fetch departments/children if available
    try {
      const response = await fetch(`/api/organizational-units?parentId=${divisionId}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleSectorHeadChange = async (sectorHeadInitials: string) => {
    const selectedHead = sectorHeads.find(head => head.initials === sectorHeadInitials)
    setSelectedSectorHead(sectorHeadInitials)
    setNewUserData(prev => ({ 
      ...prev, 
      sectorHeadInitials: sectorHeadInitials 
    }))
    
    // After selecting sector head, fetch hotels based on sector head
    // Note: You may need to adjust this API call based on your backend implementation
    try {
      const response = await fetch(`/api/hotels?sectorHead=${encodeURIComponent(sectorHeadInitials)}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setHotels(data.data || [])
      } else {
        // Fallback to departments under Hotel Operations division
        if (selectedDivision && selectedDivision.name === 'Hotel Operations') {
          const deptResponse = await fetch(`/api/organizational-units?parentId=${selectedDivision.id}&includeInactive=true`)
          if (deptResponse.ok) {
            const deptData = await deptResponse.json()
            setHotels(deptData.data || [])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching hotels:', error)
      // Fallback to departments under Hotel Operations division
      if (selectedDivision && selectedDivision.name === 'Hotel Operations') {
        try {
          const deptResponse = await fetch(`/api/organizational-units?parentId=${selectedDivision.id}&includeInactive=true`)
          if (deptResponse.ok) {
            const deptData = await deptResponse.json()
            setHotels(deptData.data || [])
          }
        } catch (fallbackError) {
          console.error('Error in fallback hotel fetch:', fallbackError)
        }
      }
    }
  }

  const handleDepartmentChange = async (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId)
    if (!department) return

    setSelectedDepartment(department)
    setSelectedSection(null)
    setSections([])
    setTeams([])

    // Reset dependent form fields
    setNewUserData(prev => ({
      ...prev,
      department: department.name,
      section: '',
      team: ''
    }))

    // Handle special cases based on department properties
    if (department.allowsCustomInput && department.name === 'Other') {
      setShowOtherInputs(prev => ({ ...prev, department: true }))
      return
    } else {
      setShowOtherInputs(prev => ({ ...prev, department: false }))
    }

    // Fetch sections if department has children
    try {
      const response = await fetch(`/api/organizational-units?parentId=${departmentId}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          setSections(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  // Helper functions for enhanced member addition
  const resetAddMemberDialog = () => {
    setAddMemberMode(null)
    setShowPreview(false)
    setSelectedUserForPreview(null)
    setSelectedUserId('')
    setCreateUserStep('group-setup') // Reset wizard to first step
    setNewUserData({
      name: '',
      email: '',
      firstName: '',
      lastName: '',
      middleName: '',
      username: '',
      contactNumber: '',
      positionTitle: '',
      shortName: '',
      division: '',
      department: '',
      section: '',
      team: '',
      jobLevel: '',
      password: '',
      sectorHeadInitials: ''
    })
    
    // Reset organizational selections
    setSelectedDivision(null)
    setSelectedDepartment(null)
    setSelectedSection(null)
    setSelectedSectorHead('')
    
    // Clear dynamic data
    setDepartments([])
    setSections([])
    setTeams([])
    setHotels([])
    
    setShowLivePreview(false)
  }

  // Wizard navigation functions
  const goToNextStep = () => {
    const stepOrder = ['group-setup', 'personal-info', 'contact-info', 'position-info'] as const
    const currentIndex = stepOrder.indexOf(createUserStep)
    if (currentIndex < stepOrder.length - 1) {
      setCreateUserStep(stepOrder[currentIndex + 1])
    }
  }

  const goToPreviousStep = () => {
    const stepOrder = ['group-setup', 'personal-info', 'contact-info', 'position-info'] as const
    const currentIndex = stepOrder.indexOf(createUserStep)
    if (currentIndex > 0) {
      setCreateUserStep(stepOrder[currentIndex - 1])
    }
  }

  // Validation functions for each step
  const isGroupSetupValid = () => {
    // Must have division selected
    if (!newUserData.division) return false
    
    // For Hotel Operations, need sector head and hotel selection
    if (newUserData.division === 'Hotel Operations') {
      return selectedSectorHead && newUserData.department
    }
    
    // For custom divisions, just need division name
    if (showOtherInputs.division) {
      return true
    }
    
    // For other divisions, need department selection
    return newUserData.department && newUserData.jobLevel
  }

  const isPersonalInfoValid = () => {
    return newUserData.firstName && newUserData.lastName && newUserData.name
  }

  const isContactInfoValid = () => {
    return newUserData.email && newUserData.email.includes('@') // Email is required
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddMemberDialogOpen(open)
    if (!open) {
      resetAddMemberDialog()
    }
  }

  const handleSelectExistingUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId)
    if (user) {
      setSelectedUserId(userId)
      setSelectedUserForPreview(user)
      setShowPreview(true)
    }
  }

  const handleCreateNewUser = async () => {
    // Auto-generate name if not provided but firstName and lastName are available
    const finalName = newUserData.name || `${newUserData.firstName} ${newUserData.lastName}`.trim()
    
    if (!finalName || !newUserData.email) {
      toast({
        title: "Error",
        description: "Please fill in name and email fields",
        variant: "destructive"
      })
      return
    }
    
    // Update the newUserData with the final name
    setNewUserData(prev => ({ ...prev, name: finalName }))

    try {
      setIsCreatingUser(true)
      
      // Prepare user data payload
      const userPayload: any = {
        ...newUserData,
        name: finalName,
        role: 'MEMBER',
        reportsToId: session?.user?.id
      }
      
      // Remove empty password field to let API auto-generate one
      if (!userPayload.password || userPayload.password.trim() === '') {
        delete userPayload.password
      }
      
      
      // Create new user
      const createResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        console.error('User creation failed:', createResponse.status, errorData)
        throw new Error(errorData.error || `Failed to create user (${createResponse.status})`)
      }

      const newUser = await createResponse.json()

      // Show success message with login credentials
      toast({
        title: "Account Created Successfully!",
        description: `User ${newUser.name} has been created. Login credentials will be shown below.`,
        variant: "default"
      })

      // Set up for preview with credentials
      setSelectedUserForPreview(newUser)
      setShowPreview(true)

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create new user",
        variant: "destructive"
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const confirmAddMember = async () => {
    const userToAdd = selectedUserForPreview
    if (!userToAdd) return

    try {
      // First, if there were any changes to user information, update the user
      if (addMemberMode === 'select') {
        // For existing users, check if any information was changed and update
        const originalUser = availableUsers.find(u => u.id === userToAdd.id)
        const hasChanges = originalUser && (
          originalUser.name !== userToAdd.name ||
          originalUser.firstName !== userToAdd.firstName ||
          originalUser.lastName !== userToAdd.lastName ||
          originalUser.contactNumber !== userToAdd.contactNumber ||
          originalUser.positionTitle !== userToAdd.positionTitle ||
          originalUser.hierarchyLevel !== userToAdd.hierarchyLevel
        )

        if (hasChanges) {
          const updateResponse = await fetch(`/api/users/${userToAdd.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userToAdd.name,
              firstName: userToAdd.firstName,
              lastName: userToAdd.lastName,
              contactNumber: userToAdd.contactNumber,
              positionTitle: userToAdd.positionTitle,
              hierarchyLevel: userToAdd.hierarchyLevel
            })
          })

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json()
            throw new Error(errorData.error || 'Failed to update user information')
          }
        }
      }

      // Then add the user to the team
      const response = await fetch('/api/user/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToAdd.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add team member')
      }

      const newMember = await response.json()
      setTeamMembers(prev => [...prev, newMember])
      setAvailableUsers(prev => prev.filter(user => user.id !== userToAdd.id))
      
      handleDialogOpenChange(false)
      toast({
        title: "Success",
        description: "Team member added successfully"
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add team member",
        variant: "destructive"
      })
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to add to your team",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/user/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add team member')
      }

      const newMember = await response.json()
      setTeamMembers(prev => [...prev, newMember])
      setAvailableUsers(prev => prev.filter(user => user.id !== selectedUserId))
      setSelectedUserId('')
      setIsAddMemberDialogOpen(false)

      toast({
        title: "Success",
        description: "Team member added successfully"
      })
    } catch (err: any) {
      console.error('Error adding team member:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to add team member",
        variant: "destructive"
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/user/team-members/${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }

      setTeamMembers(prev => prev.filter(member => member.id !== memberId))
      
      toast({
        title: "Success",
        description: "Team member removed successfully"
      })
    } catch (err) {
      console.error('Error removing team member:', err)
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive"
      })
    }
  }

  // Handle view profile
  const handleViewProfile = (memberId: string) => {
    setSelectedMemberIdForProfile(memberId)
    setIsProfileModalOpen(true)
  }

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false)
    setSelectedMemberIdForProfile(null)
  }

  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (session?.user?.role !== 'LEADER') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Team Overview</h1>
          <p className="text-muted-foreground">
            Manage your team members and monitor performance
          </p>
        </div>
        <Dialog open={isAddMemberDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Choose how you'd like to add a new member to your team.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
            {!addMemberMode && !showPreview && (
              <div className="space-y-4">
                {/* Step 1: Choose Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Existing User Option */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/20"
                    onClick={() => setAddMemberMode('select')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                          <UserCheck className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-lg">Select Existing User</h3>
                        <p className="text-sm text-muted-foreground">
                          Add someone who already has an account in the system
                        </p>
                        <div className="text-xs text-blue-600 font-medium">
                          {availableUsers.length} users available
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Create New Account Option */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/20"
                    onClick={() => setAddMemberMode('create')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                          <Plus className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-lg">Create Account for Member</h3>
                        <p className="text-sm text-muted-foreground">
                          Create a new account for someone new to the system
                        </p>
                        <div className="text-xs text-green-600 font-medium">
                          New member signup
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {addMemberMode === 'select' && !showPreview && (
              <div className="space-y-4">
                {/* Step 2a: Select Existing User */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCheck className="h-4 w-4" />
                  Selecting from existing users
                </div>
                
                <div className="space-y-3">
                  <Label>Available Users</Label>
                  {availableUsers.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                          onClick={() => handleSelectExistingUser(user.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                                {user.name
                                  ? user.name.split(' ').map(n => n[0]).join('')
                                  : user.email?.[0]?.toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name || 'No name set'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              {user.positionTitle && (
                                <div className="text-xs text-muted-foreground">{user.positionTitle}</div>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No available users to add</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setAddMemberMode(null)}>
                    Back
                  </Button>
                </div>
              </div>
            )}

            {addMemberMode === 'create' && (
              <div className="flex flex-col h-full space-y-4">
                {/* Step Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    Creating new account - Multi-step form
                  </div>
                  <div className="flex items-center gap-2">
                    {['group-setup', 'personal-info', 'contact-info', 'position-info'].map((step, index) => {
                      const stepNames = ['Group Setup', 'Personal Info', 'Contact Info', 'Position Info']
                      const isActive = createUserStep === step
                      const isCompleted = ['group-setup', 'personal-info', 'contact-info', 'position-info'].indexOf(createUserStep) > index
                      
                      return (
                        <div key={step} className="flex items-center gap-1">
                          <div className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                            isActive ? 'bg-blue-500 text-white' : 
                            isCompleted ? 'bg-green-500 text-white' : 
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            {stepNames[index]}
                          </span>
                          {index < 3 && <div className="w-8 h-px bg-gray-300 mx-1" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
                  {/* Left Column - Form */}
                  <div className="xl:col-span-2 space-y-4 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">

                {/* Step-based form content */}
                {createUserStep === 'group-setup' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 text-lg">GROUP SETUP</h4>
                    <p className="text-sm text-blue-700 mt-1">Follow the hierarchical flow step by step</p>
                  </div>
                  
                  {/* Step 1: Division (Dd1) */}
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Step 1</span>
                      <Label htmlFor="division" className="font-medium">Division</Label>
                    </div>
                    <Select value={selectedDivision?.id || ''} onValueChange={handleDivisionChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[400px]">
                        {divisions.map((division) => (
                          <SelectItem 
                            key={division.id} 
                            value={division.id}
                            disabled={division.disabled}
                          >
                            {division.name} {division.code && `(${division.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Other Division Input */}
                  {showOtherInputs.division && (
                    <div className="space-y-2">
                      <Label htmlFor="customDivision">Custom Division Name</Label>
                      <Input
                        id="customDivision"
                        value={newUserData.division}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, division: e.target.value }))}
                        placeholder="Enter custom division name"
                      />
                    </div>
                  )}

                  {/* Step 2: Hotel Operations - Sector Head Selection */}
                  {selectedDivision?.requiresSectorHead && (
                    <div className="space-y-2 bg-yellow-50 p-4 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">Step 1b</span>
                        <Label htmlFor="sectorHead" className="font-medium">Select Sector Head</Label>
                      </div>
                      <Select value={newUserData.sectorHeadInitials} onValueChange={handleSectorHeadChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sector head" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          {sectorHeads.map((head) => (
                            <SelectItem key={head.id} value={head.initials}>
                              {head.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Step 3: Hotel Selection (Dd4) */}
                  {selectedDivision?.name === 'Hotel Operations' && hotels.length > 0 && (
                    <div className="space-y-2 bg-purple-50 p-4 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded">Step 2</span>
                        <Label htmlFor="hotel" className="font-medium">Select Hotel</Label>
                      </div>
                      <Select 
                        value={newUserData.department} 
                        onValueChange={(value) => {
                          const selectedHotel = hotels.find(h => h.name === value)
                          setNewUserData(prev => ({ 
                            ...prev, 
                            department: value,
                            section: selectedHotel?.code || ''
                          }))
                          setShowOtherInputs(prev => ({ ...prev, hotel: value === 'Other' }))
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select hotel" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          {hotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.name}>
                              {hotel.name} {hotel.code && `(${hotel.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Step 4: Department Selection (Dd2, Dd5, Dd6) */}
                  {selectedDivision?.name !== 'Hotel Operations' && departments.length > 0 && (
                    <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">Step 2</span>
                        <Label htmlFor="department" className="font-medium">
                          {selectedDivision?.name === 'Real Property' ? 'Property Type' :
                           selectedDivision?.name === 'Shared Services - GOLI' ? 'Service Area' :
                           selectedDivision?.name === 'CSO' ? 'Business Unit' :
                           'Department'}
                        </Label>
                      </div>
                      <Select 
                        value={selectedDepartment?.id || ''} 
                        onValueChange={handleDepartmentChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          {departments.map((department) => (
                            <SelectItem 
                              key={department.id} 
                              value={department.id}
                              disabled={department.disabled}
                            >
                              {department.name} {department.code && `(${department.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Other Department Input */}
                  {showOtherInputs.department && (
                    <div className="space-y-2">
                      <Label htmlFor="customDepartment">Custom Department Name</Label>
                      <Input
                        id="customDepartment"
                        value={newUserData.department}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Enter custom department name"
                      />
                    </div>
                  )}

                  {/* Step 5: Section Selection (Dd7 for Real Property) */}
                  {sections.length > 0 && (
                    <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">Step 3</span>
                        <Label htmlFor="section" className="font-medium">Section</Label>
                      </div>
                      <Select 
                        value={selectedSection?.id || ''} 
                        onValueChange={async (sectionId) => {
                          const section = sections.find(s => s.id === sectionId)
                          if (!section) return
                          
                          setSelectedSection(section)
                          setNewUserData(prev => ({ 
                            ...prev, 
                            section: section.name,
                            team: '' 
                          }))
                          
                          // Fetch teams for this section if available
                          try {
                            const response = await fetch(`/api/teams-data?sectionId=${sectionId}&sectionName=${encodeURIComponent(section.name)}&includeInactive=true`)
                            if (response.ok) {
                              const data = await response.json()
                              setTeams(data.data || [])
                            }
                          } catch (error) {
                            console.error('Error fetching teams for section:', error)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name} {section.code && `(${section.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Section Input for Shared Services & CSO */}
                  {(['Shared Services - GOLI', 'CSO'].includes(selectedDivision?.name || '') && 
                    selectedDepartment?.requiresSectionInput && 
                    newUserData.department && 
                    newUserData.department !== 'Other') && (
                    <div className="space-y-2">
                      <Label htmlFor="sectionInput">Section</Label>
                      <Input
                        id="sectionInput"
                        value={newUserData.section}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, section: e.target.value }))}
                        placeholder="Enter section name"
                      />
                    </div>
                  )}

                  {/* Step 6: Team Selection/Input */}
                  {(newUserData.department || newUserData.section) && (
                    <div className="space-y-2">
                      <Label htmlFor="team">Team</Label>
                      {teams.length > 0 ? (
                        <Select 
                          value={newUserData.team} 
                          onValueChange={(value) => {
                            if (value === 'custom') {
                              setShowOtherInputs(prev => ({ ...prev, section: true }))
                              setNewUserData(prev => ({ ...prev, team: '' }))
                            } else {
                              setShowOtherInputs(prev => ({ ...prev, section: false }))
                              setNewUserData(prev => ({ ...prev, team: value }))
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent className="max-w-[400px]">
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.name}>
                                {team.name} {team.code && `(${team.code})`}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Other - Custom Team</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="team"
                          value={newUserData.team}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, team: e.target.value }))}
                          placeholder="Enter team label (optional)"
                        />
                      )}
                    </div>
                  )}

                  {/* Position & Job Information - Part of Group Setup */}
                  <div className="space-y-4 border-t pt-4">
                    <h5 className="font-medium text-blue-900 text-sm">Position & Job Level</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="positionTitle">Position Title</Label>
                        <Input
                          id="positionTitle"
                          value={newUserData.positionTitle}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, positionTitle: e.target.value }))}
                          placeholder="Enter position title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="jobLevel">Job Level *</Label>
                        <Select
                          value={newUserData.jobLevel}
                          onValueChange={(value) => setNewUserData(prev => ({ ...prev, jobLevel: value }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select job level" />
                          </SelectTrigger>
                          <SelectContent className="max-w-[400px]">
                            {jobLevels.map((level) => (
                              <SelectItem key={level.name} value={level.name}>
                                {level.name} {level.description && `- ${level.description}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Step 2: Personal Information */}
                {createUserStep === 'personal-info' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 text-lg">PERSONAL INFORMATION</h4>
                    <p className="text-sm text-green-700 mt-1">Enter personal identification details</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newUserData.firstName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newUserData.lastName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={newUserData.middleName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, middleName: e.target.value }))}
                        placeholder="Enter middle name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortName">Short Name</Label>
                      <Input
                        id="shortName"
                        value={newUserData.shortName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, shortName: e.target.value }))}
                        placeholder="Enter short name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={newUserData.name}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                </div>
                )}

                {/* Step 3: Contact Information */}
                {createUserStep === 'contact-info' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 text-lg">CONTACT INFORMATION</h4>
                    <p className="text-sm text-purple-700 mt-1">Enter contact details and system access information</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={newUserData.contactNumber}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, contactNumber: e.target.value }))}
                        placeholder="Enter contact number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username (optional)"
                    />
                  </div>
                </div>
                )}

                {/* Step 4: Final Review */}
                {createUserStep === 'position-info' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 text-lg">FINAL REVIEW</h4>
                    <p className="text-sm text-orange-700 mt-1">Review all information before creating account</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h5 className="font-medium mb-3">Account Summary</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Full Name:</span>
                          <div>{newUserData.name || `${newUserData.firstName} ${newUserData.lastName}`.trim() || 'Not provided'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Email:</span>
                          <div>{newUserData.email || 'Not provided'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Division:</span>
                          <div>{newUserData.division || 'Not selected'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Department:</span>
                          <div>{newUserData.department || 'Not selected'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Section:</span>
                          <div>{newUserData.section || 'Not applicable'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Team:</span>
                          <div>{newUserData.team || 'Not specified'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Position:</span>
                          <div>{newUserData.positionTitle || 'Not specified'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Job Level:</span>
                          <div>{newUserData.jobLevel || 'Not selected'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-900 mb-1">Account Creation Notice</div>
                          <div className="text-blue-700">
                            The account will be created with the default password "sogopassword". 
                            The login credentials will be displayed after account creation.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                  </div>

                  {/* Right Column - Live Preview */}
                  <div className="xl:col-span-1 space-y-4 overflow-y-auto pl-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="sticky top-0 bg-white z-10 pb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        Live Preview
                      </div>
                    </div>
                      
                      {showLivePreview && selectedUserForPreview && (
                        <Card className="border-2 border-primary/20 bg-primary/5">
                          <CardContent className="p-3">
                            <div className="space-y-3">
                              {/* Avatar and Basic Info */}
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={selectedUserForPreview.image || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-sm">
                                    {selectedUserForPreview.name
                                      ? selectedUserForPreview.name.split(' ').map(n => n[0]).join('')
                                      : selectedUserForPreview.email?.[0]?.toUpperCase()
                                    }
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-foreground text-sm truncate">
                                    {selectedUserForPreview.name || 'Enter name...'}
                                  </h3>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {selectedUserForPreview.email || 'Enter email...'}
                                  </p>
                                </div>
                              </div>

                              {/* Organizational Path */}
                              <div className="space-y-2 text-xs">
                                {/* Build organizational path */}
                                {((selectedUserForPreview as any).division || 
                                  (selectedUserForPreview as any).department || 
                                  (selectedUserForPreview as any).section) && (
                                  <div className="p-2 bg-gray-50 rounded border">
                                    <span className="font-medium text-gray-700 text-xs">Path:</span>
                                    <div className="text-xs text-gray-600 mt-1 break-words">
                                      {[
                                        (selectedUserForPreview as any).division,
                                        (selectedUserForPreview as any).department,
                                        (selectedUserForPreview as any).section,
                                        (selectedUserForPreview as any).team
                                      ].filter(Boolean).join(' → ') || 'Not set'}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-1">
                                  {/* Personal Information */}
                                  {((selectedUserForPreview as any).firstName || (selectedUserForPreview as any).lastName) && (
                                    <div className="text-xs bg-blue-50 p-2 rounded border">
                                      <span className="font-medium text-blue-700">Personal Details:</span>
                                      <div className="mt-1 text-blue-600">
                                        {(selectedUserForPreview as any).firstName && (
                                          <div>First: {(selectedUserForPreview as any).firstName}</div>
                                        )}
                                        {(selectedUserForPreview as any).lastName && (
                                          <div>Last: {(selectedUserForPreview as any).lastName}</div>
                                        )}
                                        {(selectedUserForPreview as any).middleName && (
                                          <div>Middle: {(selectedUserForPreview as any).middleName}</div>
                                        )}
                                        {(selectedUserForPreview as any).shortName && (
                                          <div>Short: {(selectedUserForPreview as any).shortName}</div>
                                        )}
                                        {(selectedUserForPreview as any).username && (
                                          <div>Username: {(selectedUserForPreview as any).username}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Position & Job Information */}
                                  {selectedUserForPreview.positionTitle && (
                                    <div><span className="font-medium">Position:</span> {selectedUserForPreview.positionTitle}</div>
                                  )}
                                  {(selectedUserForPreview as any).jobLevel && (
                                    <div><span className="font-medium">Job Level:</span> {(selectedUserForPreview as any).jobLevel}</div>
                                  )}
                                  {selectedUserForPreview.contactNumber && (
                                    <div><span className="font-medium">Contact:</span> {selectedUserForPreview.contactNumber}</div>
                                  )}
                                  {selectedSectorHead && (
                                    <div><span className="font-medium">Sector Head:</span> {selectedSectorHead}</div>
                                  )}
                                </div>
                              </div>

                              <div className="p-2 bg-green-50 rounded border border-green-200">
                                <div className="text-xs text-green-700">
                                  <div className="font-medium">Account Ready</div>
                                  {(selectedUserForPreview as any).temporaryPassword ? (
                                    <div className="mt-2 space-y-1">
                                      <div className="font-medium text-green-800">🎉 Account Created Successfully!</div>
                                      <div><strong>Email:</strong> {selectedUserForPreview.email}</div>
                                      <div><strong>Password:</strong> {(selectedUserForPreview as any).temporaryPassword}</div>
                                      <div className="text-xs text-green-600 mt-2">
                                        💡 Save these credentials! The user can login with this information.
                                      </div>
                                    </div>
                                  ) : (
                                    <div>Password: Default password will be assigned</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                {/* Step Navigation */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    {createUserStep !== 'group-setup' && (
                      <Button variant="outline" onClick={goToPreviousStep}>
                        Previous
                      </Button>
                    )}
                    {createUserStep === 'group-setup' && (
                      <Button variant="outline" onClick={() => setAddMemberMode(null)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {createUserStep !== 'position-info' ? (
                      <Button 
                        onClick={goToNextStep}
                        disabled={
                          (createUserStep === 'group-setup' && !isGroupSetupValid()) ||
                          (createUserStep === 'personal-info' && !isPersonalInfoValid()) ||
                          (createUserStep === 'contact-info' && !isContactInfoValid())
                        }
                      >
                        Next
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleCreateNewUser}
                        disabled={isCreatingUser || !isPersonalInfoValid() || !newUserData.email}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isCreatingUser ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create & Add Member
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showPreview && selectedUserForPreview && addMemberMode !== 'create' && (
              <div className="space-y-4">
                {/* Step 3: Preview Form - Editable Member Information */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Preview & Edit Member Information
                </div>

                <div className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4 p-4 bg-accent/20 rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedUserForPreview.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-lg">
                        {selectedUserForPreview.name
                          ? selectedUserForPreview.name.split(' ').map(n => n[0]).join('')
                          : selectedUserForPreview.email?.[0]?.toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Member Preview</h3>
                      <p className="text-sm text-muted-foreground">Review and edit member information before adding to team</p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Personal Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview-firstName">First Name</Label>
                        <Input
                          id="preview-firstName"
                          value={selectedUserForPreview.firstName || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-lastName">Last Name</Label>
                        <Input
                          id="preview-lastName"
                          value={selectedUserForPreview.lastName || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview-middleName">Middle Name</Label>
                        <Input
                          id="preview-middleName"
                          value={(selectedUserForPreview as any).middleName || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, middleName: e.target.value } as any : null)}
                          placeholder="Enter middle name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-shortName">Short Name</Label>
                        <Input
                          id="preview-shortName"
                          value={(selectedUserForPreview as any).shortName || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, shortName: e.target.value } as any : null)}
                          placeholder="Enter short name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preview-fullName">Full Name *</Label>
                      <Input
                        id="preview-fullName"
                        value={selectedUserForPreview.name || ''}
                        onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Contact Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview-email">Email Address *</Label>
                        <Input
                          id="preview-email"
                          type="email"
                          value={selectedUserForPreview.email}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, email: e.target.value } : null)}
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-contactNumber">Contact Number</Label>
                        <Input
                          id="preview-contactNumber"
                          value={selectedUserForPreview.contactNumber || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, contactNumber: e.target.value } : null)}
                          placeholder="Enter contact number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preview-username">Username</Label>
                      <Input
                        id="preview-username"
                        value={(selectedUserForPreview as any).username || ''}
                        onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, username: e.target.value } as any : null)}
                        placeholder="Enter username"
                      />
                    </div>
                  </div>

                  {/* Organizational Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Organizational Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview-division">Division</Label>
                        <Input
                          id="preview-division"
                          value={(selectedUserForPreview as any).division || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, division: e.target.value } as any : null)}
                          placeholder="Enter division"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-department">Department</Label>
                        <Input
                          id="preview-department"
                          value={(selectedUserForPreview as any).department || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, department: e.target.value } as any : null)}
                          placeholder="Enter department"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview-section">Section</Label>
                        <Input
                          id="preview-section"
                          value={(selectedUserForPreview as any).section || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, section: e.target.value } as any : null)}
                          placeholder="Enter section"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-team">Team</Label>
                        <Input
                          id="preview-team"
                          value={(selectedUserForPreview as any).team || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, team: e.target.value } as any : null)}
                          placeholder="Enter team"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Position Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Position Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview-positionTitle">Position Title</Label>
                        <Input
                          id="preview-positionTitle"
                          value={selectedUserForPreview.positionTitle || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, positionTitle: e.target.value } : null)}
                          placeholder="Enter position title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-jobLevel">Job Level</Label>
                        <Input
                          id="preview-jobLevel"
                          value={(selectedUserForPreview as any).jobLevel || ''}
                          onChange={(e) => setSelectedUserForPreview(prev => prev ? { ...prev, jobLevel: e.target.value } as any : null)}
                          placeholder="Enter job level"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preview-jobLevel">Job Level</Label>
                      <Select
                        value={(selectedUserForPreview as any).jobLevel || 'RF1'}
                        onValueChange={(value) => setSelectedUserForPreview(prev => prev ? { ...prev, jobLevel: value } as any : null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          <SelectItem value="RF1">RF1</SelectItem>
                          <SelectItem value="RF2">RF2</SelectItem>
                          <SelectItem value="RF3">RF3</SelectItem>
                          <SelectItem value="OF1">OF1</SelectItem>
                          <SelectItem value="OF2">OF2</SelectItem>
                          <SelectItem value="M1">M1</SelectItem>
                          <SelectItem value="M2">M2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="font-medium">Team Member</span>
                        <span className="text-sm text-muted-foreground ml-auto">Will report to you</span>
                      </div>
                    </div>
                  </div>

                  {/* Success Notice with Login Credentials */}
                  {(selectedUserForPreview as any).temporaryPassword ? (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-3">
                        <UserCheck className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-green-900 mb-3">🎉 Account Created Successfully!</div>
                          <div className="bg-white p-3 rounded border border-green-200 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-green-800">Login Credentials:</div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const credentialsText = `Email: ${selectedUserForPreview.email}\nPassword: ${(selectedUserForPreview as any).temporaryPassword}`
                                  navigator.clipboard.writeText(credentialsText)
                                  toast({
                                    title: "Copied!",
                                    description: "Login credentials copied to clipboard",
                                    variant: "default"
                                  })
                                }}
                                className="h-6 text-xs"
                              >
                                Copy
                              </Button>
                            </div>
                            <div className="space-y-1 text-green-700">
                              <div><strong>Email:</strong> <code className="bg-green-100 px-2 py-1 rounded text-sm">{selectedUserForPreview.email}</code></div>
                              <div><strong>Password:</strong> <code className="bg-green-100 px-2 py-1 rounded text-sm">{(selectedUserForPreview as any).temporaryPassword}</code></div>
                            </div>
                          </div>
                          <div className="text-green-700">
                            💡 <strong>Important:</strong> Save these credentials and share them securely with the new team member. 
                            They can use these to log in to the system immediately.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Confirmation Notice for existing users
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-900 mb-1">Ready to add to team</div>
                          <div className="text-blue-700">
                            This member will be added to your team with the information above. 
                            You can make final adjustments before confirming.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPreview(false)
                      setSelectedUserForPreview(null)
                    }}
                  >
                    Back to Edit
                  </Button>
                  <Button 
                    onClick={confirmAddMember} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!selectedUserForPreview.name || !selectedUserForPreview.email}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm & Add Member
                  </Button>
                </div>
              </div>
            )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Stats */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.activeTasks}</div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{teamStats.overdueTasks}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({filteredMembers.length})
          </CardTitle>
          <CardDescription>
            Your direct reports and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No members match your search' : 'Start building your team by adding members'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="group relative cursor-pointer"
                      title={`${member.name} - ${member.email}`}
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-200 group-hover:scale-105">
                        <AvatarImage 
                          src={member.image || undefined} 
                          className="group-hover:brightness-110 transition-all duration-200"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-200">
                          {member.name
                            ? member.name.split(' ').map(n => n[0]).join('')
                            : member.email?.[0]?.toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      {/* Status indicator */}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                        member.isActive ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">
                          {member.name || 'Unnamed User'}
                        </h4>
                        <Badge variant={member.isActive ? 'default' : 'secondary'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                        {member.positionTitle && (
                          <div>{member.positionTitle}</div>
                        )}
                        {member.contactNumber && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.contactNumber}
                          </div>
                        )}
                      </div>
                      
                      {member._count && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckSquare className="h-3 w-3" />
                          {member._count.assignedTasks} assigned tasks
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewProfile(member.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Assign Task
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Remove from Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Profile Modal */}
      <MemberProfileModal
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        memberId={selectedMemberIdForProfile}
      />
    </div>
  )
}
