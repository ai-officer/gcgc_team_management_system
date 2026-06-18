'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Users, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Division {
  id: string
  name: string
  code?: string
  description?: string
}

interface Department {
  id: string
  name: string
  code?: string
  divisionId: string
}

interface Section {
  id: string
  name: string
  code?: string
  departmentId: string
}

interface TeamLabel {
  id: string
  name: string
  code?: string
  sectionId: string
}

interface HierarchicalDropdownProps {
  onComplete?: (data: any) => void
  className?: string
}

export function HierarchicalDropdown({ onComplete, className }: HierarchicalDropdownProps) {
  // State for dropdown data
  const [divisions, setDivisions] = useState<Division[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [teamLabels, setTeamLabels] = useState<TeamLabel[]>([])
  
  // State for selections
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [selectedTeamLabel, setSelectedTeamLabel] = useState<TeamLabel | null>(null)
  
  // State for custom inputs
  const [customDivisionLabel, setCustomDivisionLabel] = useState('')
  const [customSectionInput, setCustomSectionInput] = useState('')
  const [customTeamInput, setCustomTeamInput] = useState('')
  const [sectorHeadInitials, setSectorHeadInitials] = useState('')
  
  // State for hotel operations multiple selection
  const [selectedHotelDepartments, setSelectedHotelDepartments] = useState<Department[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/admin/divisions?includeInactive=true')
      if (response.ok) {
        const data = await response.json()
        setDivisions(data.divisions || [])
      }
    } catch (error) {
      console.error('Error fetching divisions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async (divisionId: string) => {
    try {
      const response = await fetch(`/api/admin/departments?divisionId=${divisionId}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.departments || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchSections = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/admin/sections?departmentId=${departmentId}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setSections(data.sections || [])
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const fetchTeamLabels = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/admin/team-labels?sectionId=${sectionId}&includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setTeamLabels(data.teamLabels || [])
      }
    } catch (error) {
      console.error('Error fetching team labels:', error)
    }
  }

  const handleDivisionChange = async (divisionId: string) => {
    const division = divisions.find(d => d.id === divisionId) || null
    setSelectedDivision(division)
    
    // Reset all subsequent selections
    setSelectedDepartment(null)
    setSelectedSection(null)
    setSelectedTeamLabel(null)
    setDepartments([])
    setSections([])
    setTeamLabels([])
    setSelectedHotelDepartments([])
    
    // Reset custom inputs
    setCustomDivisionLabel('')
    setCustomSectionInput('')
    setCustomTeamInput('')
    setSectorHeadInitials('')
    
    if (division && division.code !== 'OTHER') {
      await fetchDepartments(divisionId)
    }
  }

  const handleDepartmentChange = async (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId) || null
    setSelectedDepartment(department)
    
    // Reset subsequent selections
    setSelectedSection(null)
    setSelectedTeamLabel(null)
    setSections([])
    setTeamLabels([])
    
    // Reset custom inputs
    setCustomSectionInput('')
    setCustomTeamInput('')
    
    if (department) {
      // For Real Property (Dd7 flow), fetch sections
      if (selectedDivision?.code === 'RP') {
        await fetchSections(departmentId)
      }
    }
  }

  const handleSectionChange = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId) || null
    setSelectedSection(section)
    
    // Reset subsequent selections
    setSelectedTeamLabel(null)
    setTeamLabels([])
    
    if (section) {
      await fetchTeamLabels(sectionId)
    }
  }

  const handleHotelDepartmentToggle = (department: Department) => {
    setSelectedHotelDepartments(prev => {
      const exists = prev.find(d => d.id === department.id)
      if (exists) {
        return prev.filter(d => d.id !== department.id)
      } else {
        return [...prev, department]
      }
    })
  }

  const getFlowDescription = () => {
    if (!selectedDivision) return "Select a division to start the organizational flow"
    
    const flowDescriptions: Record<string, string> = {
      'RP': 'Real Property → Department (ETII/ECLI/KPPI) → Section (CDG/F&A/S&M) → Section Label',
      'HO': 'Hotel Operations → Sector Head Initials → Multiple Hotel Selection → Team Label',
      'HF': 'Hotel Franchising (For later implementation)',
      'SSGOLI': 'Shared Services → Department → Section Input → Team Input',
      'CSO': 'CSO → Department → Section Label → Team Label',
      'OTHER': 'Other → Custom Label Input'
    }
    
    return flowDescriptions[selectedDivision.code || 'OTHER'] || flowDescriptions['OTHER']
  }

  const renderDivisionStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Dd1 - Division Selection
        </CardTitle>
        <CardDescription>{getFlowDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Select Division *</Label>
          <Select onValueChange={handleDivisionChange} value={selectedDivision?.id || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a division..." />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name} {division.code && `(${division.code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedDivision?.code === 'OTHER' && (
          <div>
            <Label>Custom Division Label</Label>
            <Input
              value={customDivisionLabel}
              onChange={(e) => setCustomDivisionLabel(e.target.value)}
              placeholder="Enter custom division name"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderHotelOperationsFlow = () => (
    <>
      {/* Dd2 - Sector Head Initials */}
      <Card>
        <CardHeader>
          <CardTitle>Dd2 - Sector Head Initials</CardTitle>
          <CardDescription>Enter sector head initials for Hotel Operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Sector Head Initials</Label>
            <Input
              value={sectorHeadInitials}
              onChange={(e) => setSectorHeadInitials(e.target.value)}
              placeholder="Enter sector head initials"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dd4 - Hotel Department Selection (Multiple Choice) */}
      <Card>
        <CardHeader>
          <CardTitle>Dd4 - Hotel Selection (Multiple Choice)</CardTitle>
          <CardDescription>Select one or more hotels with their codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedHotelDepartments.find(d => d.id === dept.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleHotelDepartmentToggle(dept)}
              >
                <div className="font-medium">{dept.name}</div>
                <div className="text-sm text-gray-500">Code: {dept.code}</div>
              </div>
            ))}
          </div>
          
          {selectedHotelDepartments.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800">Selected Hotels:</div>
              <div className="text-sm text-green-700">
                {selectedHotelDepartments.map(dept => `${dept.name} (${dept.code})`).join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )

  const renderRealPropertyFlow = () => (
    <>
      {/* Dd3 - Real Property Department */}
      <Card>
        <CardHeader>
          <CardTitle>Dd3 - Real Property Department</CardTitle>
          <CardDescription>Select department (ETII/ECLI/KPPI)</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Select Department *</Label>
            <Select onValueChange={handleDepartmentChange} value={selectedDepartment?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} {dept.code && `(${dept.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dd7 - Sections */}
      {selectedDepartment && (
        <Card>
          <CardHeader>
            <CardTitle>Dd7 - Section Selection</CardTitle>
            <CardDescription>Select section (CDG/F&A/S&M)</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Select Section *</Label>
              <Select onValueChange={handleSectionChange} value={selectedSection?.id || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a section..." />
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
          </CardContent>
        </Card>
      )}
    </>
  )

  const renderSharedServicesFlow = () => (
    <>
      {/* Dd5 - Shared Services Department */}
      <Card>
        <CardHeader>
          <CardTitle>Dd5 - Shared Services Department</CardTitle>
          <CardDescription>Select department with section/team inputs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Department *</Label>
            <Select onValueChange={handleDepartmentChange} value={selectedDepartment?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedDepartment && (
            <>
              <div>
                <Label>Section Input</Label>
                <Input
                  value={customSectionInput}
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  placeholder="Enter section name"
                />
              </div>
              
              <div>
                <Label>Team Input</Label>
                <Input
                  value={customTeamInput}
                  onChange={(e) => setCustomTeamInput(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )

  const renderCSOFlow = () => (
    <>
      {/* Dd6 - CSO Department */}
      <Card>
        <CardHeader>
          <CardTitle>Dd6 - CSO Department</CardTitle>
          <CardDescription>Select department with section/team labels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Department *</Label>
            <Select onValueChange={handleDepartmentChange} value={selectedDepartment?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedDepartment && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>Flow:</strong> {selectedDepartment.name} → Section Label → Team Label
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Section and team labels will be generated based on department selection
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )

  const renderConditionalFlow = () => {
    if (!selectedDivision) return null

    switch (selectedDivision.code) {
      case 'HO':
        return renderHotelOperationsFlow()
      case 'RP':
        return renderRealPropertyFlow()
      case 'SSGOLI':
        return renderSharedServicesFlow()
      case 'CSO':
        return renderCSOFlow()
      case 'HF':
        return (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="text-gray-500">
                Hotel Franchising flow will be implemented later
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Hierarchical Dropdown System</h2>
        <p className="text-gray-600 mt-2">
          Interactive demonstration of the organizational structure dropdown flows
        </p>
      </div>

      {renderDivisionStep()}
      {renderConditionalFlow()}

      {/* Summary */}
      {selectedDivision && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Current Selection Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Division:</strong> {selectedDivision.name} {selectedDivision.code && `(${selectedDivision.code})`}</div>
            
            {selectedDivision.code === 'OTHER' && customDivisionLabel && (
              <div><strong>Custom Label:</strong> {customDivisionLabel}</div>
            )}
            
            {selectedDivision.code === 'HO' && (
              <>
                {sectorHeadInitials && <div><strong>Sector Head:</strong> {sectorHeadInitials}</div>}
                {selectedHotelDepartments.length > 0 && (
                  <div><strong>Hotels:</strong> {selectedHotelDepartments.map(d => `${d.name} (${d.code})`).join(', ')}</div>
                )}
              </>
            )}
            
            {selectedDepartment && (
              <div><strong>Department:</strong> {selectedDepartment.name} {selectedDepartment.code && `(${selectedDepartment.code})`}</div>
            )}
            
            {selectedSection && (
              <div><strong>Section:</strong> {selectedSection.name} {selectedSection.code && `(${selectedSection.code})`}</div>
            )}
            
            {customSectionInput && (
              <div><strong>Section Input:</strong> {customSectionInput}</div>
            )}
            
            {customTeamInput && (
              <div><strong>Team Input:</strong> {customTeamInput}</div>
            )}
            
            {selectedTeamLabel && (
              <div><strong>Team Label:</strong> {selectedTeamLabel.name} {selectedTeamLabel.code && `(${selectedTeamLabel.code})`}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}