'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Crown, Eye, EyeOff, Check, Users } from 'lucide-react'
import { UserFormData, OrganizationalUnit } from '@/types'
import { cn } from '@/lib/utils'

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

// Field error type
interface FieldErrors {
  firstName?: string
  lastName?: string
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  contactNumber?: string
  reportsToId?: string
  positionTitle?: string
  division?: string
  jobLevel?: string
}

const STEPS = [
  { id: 1, label: 'Personal', description: 'Your basic information' },
  { id: 2, label: 'Contact', description: 'Contact & account details' },
  { id: 3, label: 'Role & Org', description: 'Role and organization' },
  { id: 4, label: 'Security', description: 'Password setup' },
]

export function RegistrationForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Validate a single field
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required'
        if (value.trim().length < 2) return 'First name must be at least 2 characters'
        return undefined
      case 'lastName':
        if (!value.trim()) return 'Last name is required'
        if (value.trim().length < 2) return 'Last name must be at least 2 characters'
        return undefined
      case 'email':
        if (!value.trim()) return 'Email is required'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Please enter a valid email address'
        const allowedDomains = ['gmail.com', 'globalofficium.com']
        const emailDomain = value.split('@')[1]?.toLowerCase()
        if (!allowedDomains.includes(emailDomain)) {
          return 'Email must be @gmail.com or @globalofficium.com'
        }
        return undefined
      case 'username':
        if (!value.trim()) return 'Username is required'
        if (value.trim().length < 3) return 'Username must be at least 3 characters'
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores'
        return undefined
      case 'password':
        if (!value) return 'Password is required'
        if (value.length < 6) return 'Password must be at least 6 characters'
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter'
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
        return undefined
      case 'confirmPassword':
        if (!value) return 'Please confirm your password'
        if (value !== formData.password) return 'Passwords do not match'
        return undefined
      case 'contactNumber':
        if (!value.trim()) return 'Contact number is required'
        if (!/^\d+$/.test(value)) return 'Contact number must contain only digits'
        if (!value.startsWith('09')) return 'Contact number must start with 09'
        if (value.length !== 11) return 'Contact number must be exactly 11 digits'
        return undefined
      case 'positionTitle':
        if (!value.trim()) return 'Position title is required'
        return undefined
      default:
        return undefined
    }
  }

  // Handle field blur (when user leaves a field)
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = field === 'confirmPassword' ? confirmPassword : (formData[field as keyof UserFormData] as string || '')
    const error = validateField(field, value)
    setFieldErrors(prev => ({ ...prev, [field]: error }))
  }

  // Validate fields for the current step
  const validateStep = (step: number): boolean => {
    const errors: FieldErrors = {}

    if (step === 1) {
      errors.firstName = validateField('firstName', formData.firstName)
      errors.lastName = validateField('lastName', formData.lastName)
    }

    if (step === 2) {
      errors.email = validateField('email', formData.email)
      errors.username = validateField('username', formData.username)
      errors.contactNumber = validateField('contactNumber', formData.contactNumber)
    }

    if (step === 3) {
      errors.positionTitle = validateField('positionTitle', formData.positionTitle)
      if (!formData.isLeader && !formData.reportsToId) {
        errors.reportsToId = 'Please select who you report to'
      }
      if (!selectedDivision) {
        errors.division = 'Please select a division'
      }
      if (!formData.jobLevel) {
        errors.jobLevel = 'Please select a job level'
      }
    }

    if (step === 4) {
      errors.password = validateField('password', formData.password)
      errors.confirmPassword = validateField('confirmPassword', confirmPassword)
    }

    const newTouched: Record<string, boolean> = {}
    Object.keys(errors).forEach(key => { newTouched[key] = true })
    setTouched(prev => ({ ...prev, ...newTouched }))
    setFieldErrors(prev => ({ ...prev, ...errors }))

    return !Object.values(errors).some(e => e !== undefined)
  }

  // Validate all required fields
  const validateAllFields = (): boolean => {
    const errors: FieldErrors = {}

    errors.firstName = validateField('firstName', formData.firstName)
    errors.lastName = validateField('lastName', formData.lastName)
    errors.email = validateField('email', formData.email)
    errors.username = validateField('username', formData.username)
    errors.contactNumber = validateField('contactNumber', formData.contactNumber)
    errors.positionTitle = validateField('positionTitle', formData.positionTitle)
    errors.password = validateField('password', formData.password)
    errors.confirmPassword = validateField('confirmPassword', confirmPassword)

    // Reports To is required only for non-leaders
    if (!formData.isLeader && !formData.reportsToId) {
      errors.reportsToId = 'Please select who you report to'
    }

    if (!selectedDivision) {
      errors.division = 'Please select a division'
    }

    if (!formData.jobLevel) {
      errors.jobLevel = 'Please select a job level'
    }

    setFieldErrors(errors)
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      contactNumber: true,
      reportsToId: true,
      positionTitle: true,
      password: true,
      confirmPassword: true,
      division: true,
      jobLevel: true
    })

    return !Object.values(errors).some(error => error !== undefined)
  }

  // Error message component
  const FieldError = ({ error }: { error?: string }) => {
    if (!error) return null
    return <p className="text-sm text-red-500 mt-1">{error}</p>
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
    setError('')
    setSuccess('')

    // Validate all fields first
    if (!validateAllFields()) {
      setError('Please fix the errors below before submitting')
      return
    }

    setLoading(true)

    try {
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

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError('')
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    } else {
      setError('Please fix the errors below before continuing.')
    }
  }

  const handleBack = () => {
    setError('')
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-start justify-between relative">
          {/* Connector line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 z-0" style={{ left: '2rem', right: '2rem' }} />
          <div
            className="absolute top-4 h-0.5 bg-blue-500 z-0 transition-all duration-500"
            style={{ left: '2rem', width: `calc(${progressPercent}% * (100% - 4rem) / 100)` }}
          />

          {STEPS.map((step) => {
            const isDone = currentStep > step.id
            const isActive = currentStep === step.id
            return (
              <div key={step.id} className="flex flex-col items-center z-10 flex-1">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                    isDone && 'bg-green-500 text-white',
                    isActive && 'bg-blue-600 text-white shadow-md shadow-blue-200',
                    !isDone && !isActive && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 font-medium text-center',
                    isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Thin progress bar */}
        <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {STEPS[currentStep - 1].label}
        </h2>
        <p className="text-sm text-gray-500">{STEPS[currentStep - 1].description}</p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* ---- STEP 1: Personal Information ---- */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  placeholder="Enter first name"
                  className={touched.firstName && fieldErrors.firstName ? 'border-red-400' : ''}
                />
                {touched.firstName && <FieldError error={fieldErrors.firstName} />}
              </div>

              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  placeholder="Enter last name"
                  className={touched.lastName && fieldErrors.lastName ? 'border-red-400' : ''}
                />
                {touched.lastName && <FieldError error={fieldErrors.lastName} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="middleName" className="text-sm font-medium text-gray-700">Middle Name</Label>
                <Input
                  id="middleName"
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                  placeholder="Enter middle name"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="shortName" className="text-sm font-medium text-gray-700">Short Name</Label>
                <Input
                  id="shortName"
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => handleInputChange('shortName', e.target.value)}
                  placeholder="Enter short name"
                />
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP 2: Contact & Account ---- */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="Enter email address"
                  className={touched.email && fieldErrors.email ? 'border-red-400' : ''}
                />
                {touched.email && <FieldError error={fieldErrors.email} />}
              </div>

              <div className="space-y-1">
                <Label htmlFor="contactNumber" className="text-sm font-medium text-gray-700">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  onBlur={() => handleBlur('contactNumber')}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                  className={touched.contactNumber && fieldErrors.contactNumber ? 'border-red-400' : ''}
                />
                {touched.contactNumber && <FieldError error={fieldErrors.contactNumber} />}
                <p className="text-xs text-gray-400">Format: 09XXXXXXXXX (11 digits)</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                onBlur={() => handleBlur('username')}
                placeholder="Enter username"
                className={touched.username && fieldErrors.username ? 'border-red-400' : ''}
              />
              {touched.username && <FieldError error={fieldErrors.username} />}
              <p className="text-xs text-gray-400">Only letters, numbers, and underscores allowed</p>
            </div>
          </div>
        )}

        {/* ---- STEP 3: Role & Organization ---- */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Role selection cards */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Role</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLeaderCheckboxChange(false)}
                  className={cn(
                    'rounded-xl border-2 p-4 cursor-pointer text-center transition-all',
                    !formData.isLeader
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <Users className={cn('h-5 w-5 mx-auto mb-1.5', !formData.isLeader ? 'text-blue-600' : 'text-gray-400')} />
                  <p className={cn('text-sm font-semibold', !formData.isLeader ? 'text-blue-700' : 'text-gray-600')}>Member</p>
                  <p className="text-xs text-gray-400 mt-0.5">Standard team member</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleLeaderCheckboxChange(true)}
                  className={cn(
                    'rounded-xl border-2 p-4 cursor-pointer text-center transition-all',
                    formData.isLeader
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <Crown className={cn('h-5 w-5 mx-auto mb-1.5', formData.isLeader ? 'text-blue-600' : 'text-gray-400')} />
                  <p className={cn('text-sm font-semibold', formData.isLeader ? 'text-blue-700' : 'text-gray-600')}>Leader</p>
                  <p className="text-xs text-gray-400 mt-0.5">Team leader</p>
                </button>
              </div>
            </div>

            {/* Reports To - Only show if not leader */}
            {!formData.isLeader && (
              <div className="space-y-1">
                <Label htmlFor="reportsTo" className="text-sm font-medium text-gray-700">
                  Reports To (Leader) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.reportsToId}
                  onValueChange={(value) => {
                    handleInputChange('reportsToId', value)
                    setFieldErrors(prev => ({ ...prev, reportsToId: undefined }))
                    setTouched(prev => ({ ...prev, reportsToId: true }))
                  }}
                >
                  <SelectTrigger className={touched.reportsToId && fieldErrors.reportsToId ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Select your leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaders.map((leader) => (
                      <SelectItem key={leader.id} value={leader.id}>
                        {leader.name || `${leader.firstName} ${leader.lastName}`.trim()} ({leader.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.reportsToId && <FieldError error={fieldErrors.reportsToId} />}
              </div>
            )}

            {/* Position + Job Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="positionTitle" className="text-sm font-medium text-gray-700">
                  Position Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="positionTitle"
                  type="text"
                  value={formData.positionTitle}
                  onChange={(e) => handleInputChange('positionTitle', e.target.value)}
                  onBlur={() => handleBlur('positionTitle')}
                  placeholder="Enter position title"
                  className={touched.positionTitle && fieldErrors.positionTitle ? 'border-red-400' : ''}
                />
                {touched.positionTitle && <FieldError error={fieldErrors.positionTitle} />}
              </div>

              <div className="space-y-1">
                <Label htmlFor="jobLevel" className="text-sm font-medium text-gray-700">
                  Job Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.jobLevel}
                  onValueChange={(value) => {
                    handleInputChange('jobLevel', value)
                    setFieldErrors(prev => ({ ...prev, jobLevel: undefined }))
                    setTouched(prev => ({ ...prev, jobLevel: true }))
                  }}
                >
                  <SelectTrigger className={touched.jobLevel && fieldErrors.jobLevel ? 'border-red-400' : ''}>
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
                {touched.jobLevel && <FieldError error={fieldErrors.jobLevel} />}
              </div>
            </div>

            {/* Organizational Structure */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Organizational Structure</h3>

              {/* Division Dropdown */}
              <div className="space-y-1">
                <Label htmlFor="division" className="text-sm font-medium text-gray-700">
                  Division <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedDivision?.id || ''}
                  onValueChange={(value) => {
                    handleDivisionChange(value)
                    setFieldErrors(prev => ({ ...prev, division: undefined }))
                    setTouched(prev => ({ ...prev, division: true }))
                  }}
                >
                  <SelectTrigger className={touched.division && fieldErrors.division ? 'border-red-400' : ''}>
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
                {touched.division && <FieldError error={fieldErrors.division} />}
              </div>

              {/* Custom Division Input */}
              {showCustomDivisionInput && (
                <div className="space-y-1">
                  <Label htmlFor="customDivision" className="text-sm font-medium text-gray-700">Custom Division Name</Label>
                  <Input
                    id="customDivision"
                    type="text"
                    value={formData.customDivision}
                    onChange={(e) => handleInputChange('customDivision', e.target.value)}
                    placeholder="Enter custom division name"
                  />
                </div>
              )}

              {/* Sector Head Dropdown */}
              {showSectorHeadInput && (
                <div className="space-y-1">
                  <Label htmlFor="sectorHeadInitials" className="text-sm font-medium text-gray-700">Sector Head</Label>
                  <Select
                    value={formData.sectorHeadInitials}
                    onValueChange={(value) => {
                      const selectedHead = sectorHeads.find(head => head.initials === value)
                      handleInputChange('sectorHeadInitials', value)
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
                <div className="space-y-1">
                  <Label htmlFor="department" className="text-sm font-medium text-gray-700">
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
                <div className="space-y-1">
                  <Label htmlFor="customDepartment" className="text-sm font-medium text-gray-700">Custom Department Name</Label>
                  <Input
                    id="customDepartment"
                    type="text"
                    value={formData.customDepartment}
                    onChange={(e) => handleInputChange('customDepartment', e.target.value)}
                    placeholder="Enter custom department name"
                  />
                </div>
              )}

              {/* Section Dropdown */}
              {sections.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="section" className="text-sm font-medium text-gray-700">Section *</Label>
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
                <div className="space-y-1">
                  <Label htmlFor="customSection" className="text-sm font-medium text-gray-700">Section Name</Label>
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
                <div className="space-y-1">
                  <Label htmlFor="team" className="text-sm font-medium text-gray-700">Team</Label>
                  {teams.length > 0 ? (
                    <Select
                      value={formData.team}
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setShowCustomTeamInput(true)
                          handleInputChange('team', '')
                        } else {
                          const t = teams.find(team => team.name === value)
                          setSelectedTeam(t || null)
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
                <div className="space-y-1">
                  <Label htmlFor="customTeam" className="text-sm font-medium text-gray-700">Custom Team Name</Label>
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
          </div>
        )}

        {/* ---- STEP 4: Security ---- */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    placeholder="Enter password"
                    className={`pr-10 ${touched.password && fieldErrors.password ? 'border-red-400' : ''}`}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.password && <FieldError error={fieldErrors.password} />}
                <p className="text-xs text-gray-400">
                  Min 6 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }))
                      }
                    }}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="Confirm password"
                    className={`pr-10 ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-400' : ''}`}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.confirmPassword && <FieldError error={fieldErrors.confirmPassword} />}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
