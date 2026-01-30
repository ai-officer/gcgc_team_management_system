'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, User, Crown, ChevronDown } from 'lucide-react'
import { UserFormData, OrganizationalUnit } from '@/types'

interface Leader {
  id: string
  firstName: string | null
  lastName: string | null
  name: string
  email: string
  role: string
}

interface SectionHead {
  id: string
  name: string
  initials: string
  email: string
  role: string
  section: string
  department: string
  division: string
  positionTitle: string
}

interface SectorHead {
  id: string
  initials: string
  fullName: string
  label: string
}

export function RegistrationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [sectionHeads, setSectionHeads] = useState<SectionHead[]>([])
  const [sectorHeads, setSectorHeads] = useState<SectorHead[]>([])
  
  // Organizational structure state
  const [divisions, setDivisions] = useState<OrganizationalUnit[]>([])
  const [selectedDivision, setSelectedDivision] = useState<OrganizationalUnit | null>(null)
  const [departments, setDepartments] = useState<OrganizationalUnit[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<OrganizationalUnit | null>(null)
  const [sections, setSections] = useState<OrganizationalUnit[]>([])
  const [selectedSection, setSelectedSection] = useState<OrganizationalUnit | null>(null)
  const [jobLevels, setJobLevels] = useState<Array<{name: string; description: string | null; order: number}>>([])
  const [teams, setTeams] = useState<Array<{id: string; name: string; code?: string; type: string}>>([])
  const [selectedTeam, setSelectedTeam] = useState<{id: string; name: string; code?: string; type: string} | null>(null)

  
  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    username: '',
    contactNumber: '',
    role: 'MEMBER',
    hierarchyLevel: 'RF1',
    reportsToId: '',
    division: '',
    department: '',
    section: '',
    team: '',
    positionTitle: '',
    shortName: '',
    jobLevel: '',
    isLeader: false,
    image: '',
    password: '',
    organizationalPath: '',
    sectorHeadInitials: '',
    customDivision: '',
    customDepartment: '',
    customSection: '',
    customTeam: ''
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // UI state for custom inputs
  const [showCustomDivisionInput, setShowCustomDivisionInput] = useState(false)
  const [showCustomDepartmentInput, setShowCustomDepartmentInput] = useState(false)
  const [showCustomSectionInput, setShowCustomSectionInput] = useState(false)
  const [showCustomTeamInput, setShowCustomTeamInput] = useState(false)
  const [showSectorHeadInput, setShowSectorHeadInput] = useState(false)

  // Fetch divisions, job levels, and section heads on component mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const response = await fetch('/api/organizational-units?level=1&includeInactive=true')
        if (response.ok) {
          const data = await response.json()
          setDivisions(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching divisions:', error)
      }
    }

    const fetchJobLevels = async () => {
      try {
        const response = await fetch('/api/job-levels?includeInactive=true')
        if (response.ok) {
          const data = await response.json()
          setJobLevels(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching job levels:', error)
      }
    }

    const fetchSectionHeads = async () => {
      try {
        const response = await fetch('/api/section-heads?includeInactive=true')
        if (response.ok) {
          const data = await response.json()
          setSectionHeads(data.flatData || [])
        }
      } catch (error) {
        console.error('Error fetching section heads:', error)
      }
    }

    const fetchSectorHeads = async () => {
      try {
        const response = await fetch('/api/sector-heads?includeInactive=true')
        if (response.ok) {
          const data = await response.json()
          setSectorHeads(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching sector heads:', error)
      }
    }

    fetchDivisions()
    fetchJobLevels()
    fetchSectionHeads()
    fetchSectorHeads()
  }, [])

  // Fetch leaders for dropdown
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const response = await fetch('/api/users/leaders?includeAdmins=true&includeInactive=false')
        if (response.ok) {
          const data = await response.json()
          setLeaders(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching leaders:', error)
      }
    }

    fetchLeaders()
  }, [])

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLeaderCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isLeader: checked,
      role: checked ? 'LEADER' : 'MEMBER',
      reportsToId: checked ? '' : prev.reportsToId // Clear reportsTo if becoming leader
    }))
  }

  // Handle division selection
  const handleDivisionChange = async (divisionId: string) => {
    const division = divisions.find(d => d.id === divisionId)
    if (!division) return

    setSelectedDivision(division)
    setSelectedDepartment(null)
    setSelectedSection(null)
    setDepartments([])
    setSections([])
    
    // Reset dependent form fields
    setFormData(prev => ({
      ...prev,
      division: division.name,
      department: '',
      section: '',
      team: '',
      customDepartment: '',
      customSection: '',
      customTeam: '',
      organizationalPath: division.name
    }))

    // Handle special cases
    if (division.name === 'Other') {
      setShowCustomDivisionInput(true)
      return
    } else {
      setShowCustomDivisionInput(false)
    }

    if (division.requiresSectorHead) {
      setShowSectorHeadInput(true)
    } else {
      setShowSectorHeadInput(false)
    }

    // Fetch children if available
    if (division.children && division.children.length > 0) {
      setDepartments(division.children)
    } else {
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
  }

  // Handle department selection
  const handleDepartmentChange = async (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId)
    if (!department) return

    setSelectedDepartment(department)
    setSelectedSection(null)
    setSections([])

    // Reset dependent form fields
    setFormData(prev => ({
      ...prev,
      department: department.name,
      section: '',
      team: '',
      customSection: '',
      customTeam: '',
      organizationalPath: `${prev.division}/${department.name}`
    }))

    // Reset custom input states
    setShowCustomDepartmentInput(false)
    setShowCustomSectionInput(false)
    setShowCustomTeamInput(false)

    // Handle special cases based on department properties
    if (department.allowsCustomInput && department.name === 'Other') {
      setShowCustomDepartmentInput(true)
    }

    // For Real Property departments (ETII, ECLI, KPPI) that have sections
    if (department.children && department.children.length > 0) {
      setSections(department.children)
    } 
    // For Shared Services departments that require section input
    else if (department.requiresSectionInput) {
      setShowCustomSectionInput(true)
    }
    // For departments that require team label directly (Hotel Operations, etc.)
    else if (department.requiresTeamLabel) {
      setShowCustomTeamInput(true)
    }
  }

  // Handle section selection
  const handleSectionChange = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    setSelectedSection(section)
    
    setFormData(prev => ({
      ...prev,
      section: section.name,
      team: '',
      customTeam: '',
      organizationalPath: `${prev.division}/${prev.department}/${section.name}`
    }))

    // Fetch teams for this section
    fetchTeamsForSection(sectionId, section.name)

    // Fetch section heads for this specific section
    fetchSectionHeadsForSection(section.name)
  }

  // Fetch section heads filtered by section
  const fetchSectionHeadsForSection = async (sectionName: string) => {
    try {
      const response = await fetch(`/api/section-heads?section=${encodeURIComponent(sectionName)}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setSectionHeads(data.flatData || [])
      }
    } catch (error) {
      console.error('Error fetching section heads for section:', error)
    }
  }

  // Fetch teams for a specific section
  const fetchTeamsForSection = async (sectionId: string, sectionName: string) => {
    try {
      const response = await fetch(`/api/teams-data?sectionId=${sectionId}&sectionName=${encodeURIComponent(sectionName)}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setTeams(data.data || [])
        if (data.data && data.data.length > 0) {
          setShowCustomTeamInput(false) // Hide custom input if teams are available
        } else {
          setShowCustomTeamInput(true) // Show custom input if no predefined teams
        }
      }
    } catch (error) {
      console.error('Error fetching teams for section:', error)
      setShowCustomTeamInput(true) // Fallback to custom input
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!formData.username || formData.username.length < 3) {
        throw new Error("Username must be at least 3 characters")
      }

      if (formData.password !== confirmPassword) {
        throw new Error("Passwords don't match")
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          confirmPassword
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setSuccess('Registration successful! You can now sign in.')
      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          User Registration Portal
        </CardTitle>
        <CardDescription>
          Create your account to access the team management system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                type="text"
                value={formData.middleName}
                onChange={(e) => handleInputChange('middleName', e.target.value)}
                placeholder="Enter middle name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name</Label>
              <Input
                id="shortName"
                type="text"
                value={formData.shortName}
                onChange={(e) => handleInputChange('shortName', e.target.value)}
                placeholder="Enter short name"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                placeholder="Enter contact number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          {/* Leadership Checkbox */}
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <Checkbox
              id="isLeader"
              checked={formData.isLeader}
              onCheckedChange={handleLeaderCheckboxChange}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="isLeader"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Click if Leader
              </Label>
              <p className="text-xs text-muted-foreground">
                Check this box if you are registering as a team leader
              </p>
            </div>
          </div>

          {/* Reports To - Only show if not leader */}
          {!formData.isLeader && (
            <div className="space-y-2">
              <Label htmlFor="reportsTo">Reports To (Leader)</Label>
              <Select value={formData.reportsToId} onValueChange={(value) => handleInputChange('reportsToId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your leader (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      {leader.name || `${leader.firstName} ${leader.lastName}`.trim()} ({leader.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Organizational Structure */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Organizational Structure</h3>
            
            {/* Division Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="division">Division *</Label>
              <Select value={selectedDivision?.id || ''} onValueChange={handleDivisionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
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

            {/* Custom Division Input */}
            {showCustomDivisionInput && (
              <div className="space-y-2">
                <Label htmlFor="customDivision">Custom Division Name</Label>
                <Input
                  id="customDivision"
                  type="text"
                  value={formData.customDivision}
                  onChange={(e) => handleInputChange('customDivision', e.target.value)}
                  placeholder="Enter custom division name"
                />
              </div>
            )}

            {/* Sector Head Dropdown (for Hotel Operations) */}
            {showSectorHeadInput && (
              <div className="space-y-2">
                <Label htmlFor="sectorHeadInitials">Sector Head</Label>
                <Select 
                  value={formData.sectorHeadInitials} 
                  onValueChange={(value) => {
                    const selectedHead = sectorHeads.find(head => head.initials === value)
                    handleInputChange('sectorHeadInitials', value)
                    // Optionally set other fields based on selection
                    if (selectedHead) {
                      console.log('Selected sector head:', selectedHead)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector head" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorHeads.map((head) => (
                      <SelectItem key={head.id} value={head.initials}>
                        {head.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Department/Hotel/Service Dropdown */}
            {departments.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="department">
                  {selectedDivision?.name === 'Hotel Operations' ? 'Hotel' : 
                   selectedDivision?.name === 'Shared Services - GOLI' ? 'Service Area' :
                   selectedDivision?.name === 'CSO' ? 'Business Unit' :
                   'Department'} *
                </Label>
                <Select value={selectedDepartment?.id || ''} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
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

            {/* Custom Department Input */}
            {showCustomDepartmentInput && (
              <div className="space-y-2">
                <Label htmlFor="customDepartment">Custom Department Name</Label>
                <Input
                  id="customDepartment"
                  type="text"
                  value={formData.customDepartment}
                  onChange={(e) => handleInputChange('customDepartment', e.target.value)}
                  placeholder="Enter custom department name"
                />
              </div>
            )}

            {/* Section Dropdown (for Real Property departments like ETII, ECLI, KPPI) */}
            {sections.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Select value={selectedSection?.id || ''} onValueChange={handleSectionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name} {section.code && `(${section.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Section Input */}
            {showCustomSectionInput && (
              <div className="space-y-2">
                <Label htmlFor="customSection">Section Name</Label>
                <Input
                  id="customSection"
                  type="text"
                  value={formData.customSection}
                  onChange={(e) => handleInputChange('customSection', e.target.value)}
                  placeholder="Enter section name"
                />
              </div>
            )}

            {/* Team Dropdown/Input */}
            {(selectedDepartment || selectedSection || showCustomTeamInput) && (
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                {teams.length > 0 ? (
                  <Select 
                    value={formData.team} 
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setShowCustomTeamInput(true)
                        handleInputChange('team', '')
                      } else {
                        const selectedTeam = teams.find(team => team.name === value)
                        setSelectedTeam(selectedTeam || null)
                        setShowCustomTeamInput(false)
                        handleInputChange('team', value)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
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
                    type="text"
                    value={formData.team}
                    onChange={(e) => handleInputChange('team', e.target.value)}
                    placeholder="Enter team label (optional)"
                  />
                )}
              </div>
            )}

            {/* Custom Team Input */}
            {showCustomTeamInput && (
              <div className="space-y-2">
                <Label htmlFor="customTeam">Custom Team Name</Label>
                <Input
                  id="customTeam"
                  type="text"
                  value={formData.customTeam}
                  onChange={(e) => handleInputChange('customTeam', e.target.value)}
                  placeholder="Enter custom team name"
                />
              </div>
            )}
          </div>

          {/* Position Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="positionTitle">Position Title</Label>
              <Input
                id="positionTitle"
                type="text"
                value={formData.positionTitle}
                onChange={(e) => handleInputChange('positionTitle', e.target.value)}
                placeholder="Enter position title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jobLevel">Job Level *</Label>
              <Select value={formData.jobLevel} onValueChange={(value) => handleInputChange('jobLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job level" />
                </SelectTrigger>
                <SelectContent>
                  {jobLevels.map((level) => (
                    <SelectItem key={level.name} value={level.name}>
                      {level.name} {level.description && `- ${level.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
