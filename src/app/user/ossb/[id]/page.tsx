'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, Users, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type OSSBStatus = 'DRAFT' | 'SUBMITTED' | 'ENDORSED' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED'
type MIPClassification = 'MAINTENANCE' | 'IMPROVEMENT' | 'PROJECT'

interface ProgramStep {
  id: string
  stepNumber: number
  description: string
  responsiblePerson: string
  deadline: string
  budget: number
}

interface OSSBRequest {
  id: string
  referenceNo: string
  branchOrDepartment: string
  objectiveTitle: string
  versionNo: string | null
  partOfAnnualPlan: boolean
  mipClassification: MIPClassification
  kraOrCpaNumber: number | null
  projectNumber: number | null
  kraOrCpaName: string | null
  titleObjective: string
  startDate: string
  endDate: string
  successMeasures: string[]
  totalBudget: number
  preparedBy: string | null
  preparedByPosition: string | null
  datePrepared: string | null
  endorsedBy: string | null
  endorsedByPosition: string | null
  dateEndorsed: string | null
  recommendedBy: string | null
  recommendedByPosition: string | null
  dateRecommended: string | null
  approvedBy: string | null
  approvedByPosition: string | null
  dateApproved: string | null
  hasGuidelines: boolean
  hasComputationValue: boolean
  otherAttachments: string | null
  ccRecipients: string | null
  remarks: string | null
  status: OSSBStatus
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  creator: {
    id: string
    name: string | null
    email: string | null
  }
  programSteps: ProgramStep[]
}

const statusColors: Record<OSSBStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  ENDORSED: 'bg-indigo-100 text-indigo-700',
  RECOMMENDED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const mipColors: Record<MIPClassification, string> = {
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  IMPROVEMENT: 'bg-blue-100 text-blue-700',
  PROJECT: 'bg-green-100 text-green-700',
}

export default function OSSBDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [ossb, setOssb] = useState<OSSBRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchOSSB = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ossb/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            variant: 'destructive',
            title: 'Not Found',
            description: 'OSSB request not found',
          })
          router.push('/user/ossb')
          return
        }
        throw new Error('Failed to fetch OSSB request')
      }
      const data = await response.json()
      setOssb(data.ossbRequest)
    } catch (error) {
      console.error('Error fetching OSSB:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load OSSB request',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOSSB()
  }, [params.id])

  const handleDelete = async () => {
    if (!ossb) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/ossb/${ossb.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete OSSB request')

      const result = await response.json()
      toast({
        title: 'Success',
        description: `${result.message}. Deleted ${result.details.tmsEventsDeleted} TMS events and ${result.details.googleEventsDeleted} Google events.`,
      })

      router.push('/user/ossb')
    } catch (error: any) {
      console.error('Error deleting OSSB:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete OSSB request: ${error.message}`,
      })
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading OSSB request...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!ossb) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">OSSB Request Not Found</h2>
          <p className="text-sm text-gray-600 mb-4">The requested OSSB could not be found.</p>
          <Button onClick={() => router.push('/user/ossb')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to OSSB Requests
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/user/ossb')}
            className="h-9 w-9 border-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{ossb.objectiveTitle}</h1>
              <Badge className={`${statusColors[ossb.status]} border-0 text-xs font-medium`}>
                {ossb.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 font-mono mt-0.5">{ossb.referenceNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/user/ossb/${ossb.id}/edit`)}
            className="border-gray-200"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-2">
        <Badge className={`${mipColors[ossb.mipClassification]} border-0 text-xs font-medium px-3 py-1`}>
          {ossb.mipClassification}
        </Badge>
        {ossb.partOfAnnualPlan && (
          <Badge variant="outline" className="text-xs font-medium px-3 py-1">
            Annual Plan
          </Badge>
        )}
      </div>

      {/* Section 1: Header Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Header Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Branch / Department</p>
            <p className="text-sm text-gray-900">{ossb.branchOrDepartment}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Version No.</p>
            <p className="text-sm text-gray-900">{ossb.versionNo || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Project Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Project Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Objective Statement</p>
            <p className="text-sm text-gray-900">{ossb.titleObjective}</p>
          </div>
          <Separator className="bg-gray-100" />
          <div className="grid grid-cols-2 gap-4">
            {ossb.kraOrCpaNumber && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">KRA/CPA Number</p>
                <p className="text-sm text-gray-900">{ossb.kraOrCpaNumber}</p>
              </div>
            )}
            {ossb.kraOrCpaName && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">KRA/CPA Name</p>
                <p className="text-sm text-gray-900">{ossb.kraOrCpaName}</p>
              </div>
            )}
            {ossb.projectNumber && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Project Number</p>
                <p className="text-sm text-gray-900">{ossb.projectNumber}</p>
              </div>
            )}
          </div>
          <Separator className="bg-gray-100" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
              <p className="text-sm text-gray-900">{formatDate(ossb.startDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">End Date</p>
              <p className="text-sm text-gray-900">{formatDate(ossb.endDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Success Measures */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Success Measures / Specific Standards</h2>
        <p className="text-sm text-gray-600 mb-4">Measurable outcomes and standards for this objective</p>
        <ol className="space-y-2">
          {ossb.successMeasures.map((measure, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-gray-900">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mt-0.5">
                {index + 1}
              </span>
              <span>{measure}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Section 4: Program Steps and Budget */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Program Steps and Budget</h2>
          </div>
          <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
            Total: {formatCurrency(ossb.totalBudget)}
          </span>
        </div>
        <div className="space-y-3">
          {ossb.programSteps.map((step) => (
            <div key={step.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                    {step.stepNumber}
                  </span>
                  <p className="text-sm text-gray-900">{step.description}</p>
                </div>
                <span className="ml-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatCurrency(step.budget)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 ml-9 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{step.responsiblePerson}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(step.deadline)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Signatories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Signatories</h2>
        <div className="grid grid-cols-2 gap-6">
          {ossb.preparedBy && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Prepared By</p>
              <p className="text-sm font-semibold text-gray-900">{ossb.preparedBy}</p>
              {ossb.preparedByPosition && <p className="text-xs text-gray-600">{ossb.preparedByPosition}</p>}
              {ossb.datePrepared && <p className="text-xs text-gray-500">{formatDate(ossb.datePrepared)}</p>}
            </div>
          )}
          {ossb.endorsedBy && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Endorsed By</p>
              <p className="text-sm font-semibold text-gray-900">{ossb.endorsedBy}</p>
              {ossb.endorsedByPosition && <p className="text-xs text-gray-600">{ossb.endorsedByPosition}</p>}
              {ossb.dateEndorsed && <p className="text-xs text-gray-500">{formatDate(ossb.dateEndorsed)}</p>}
            </div>
          )}
          {ossb.recommendedBy && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended By</p>
              <p className="text-sm font-semibold text-gray-900">{ossb.recommendedBy}</p>
              {ossb.recommendedByPosition && <p className="text-xs text-gray-600">{ossb.recommendedByPosition}</p>}
              {ossb.dateRecommended && <p className="text-xs text-gray-500">{formatDate(ossb.dateRecommended)}</p>}
            </div>
          )}
          {ossb.approvedBy && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</p>
              <p className="text-sm font-semibold text-gray-900">{ossb.approvedBy}</p>
              {ossb.approvedByPosition && <p className="text-xs text-gray-600">{ossb.approvedByPosition}</p>}
              {ossb.dateApproved && <p className="text-xs text-gray-500">{formatDate(ossb.dateApproved)}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Section 6 & 7: Additional Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
        </div>
        <div className="space-y-4">
          {(ossb.hasGuidelines || ossb.hasComputationValue) && (
            <div className="flex gap-2 flex-wrap">
              {ossb.hasGuidelines && (
                <Badge variant="outline" className="text-xs">Guidelines Attached</Badge>
              )}
              {ossb.hasComputationValue && (
                <Badge variant="outline" className="text-xs">Computation Value Attached</Badge>
              )}
            </div>
          )}
          {ossb.otherAttachments && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Other Attachments</p>
              <p className="text-sm text-gray-900">{ossb.otherAttachments}</p>
            </div>
          )}
          {ossb.ccRecipients && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">CC Recipients</p>
              <p className="text-sm text-gray-900">{ossb.ccRecipients}</p>
            </div>
          )}
          {ossb.remarks && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm text-gray-900">{ossb.remarks}</p>
            </div>
          )}
          {!ossb.hasGuidelines && !ossb.hasComputationValue && !ossb.otherAttachments && !ossb.ccRecipients && !ossb.remarks && (
            <p className="text-sm text-gray-500">No additional information provided.</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created By</p>
            <p className="text-sm font-medium text-gray-900">{ossb.creator.name || ossb.creator.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created At</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(ossb.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(ossb.updatedAt)}</p>
          </div>
          {ossb.submittedAt && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Submitted At</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(ossb.submittedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OSSB Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the OSSB request <strong>{ossb.referenceNo}</strong> and all associated calendar events (both TMS and Google Calendar). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
