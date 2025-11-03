'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  DRAFT: 'bg-gray-500',
  SUBMITTED: 'bg-blue-500',
  ENDORSED: 'bg-indigo-500',
  RECOMMENDED: 'bg-purple-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
}

const mipColors: Record<MIPClassification, string> = {
  MAINTENANCE: 'bg-amber-500',
  IMPROVEMENT: 'bg-blue-500',
  PROJECT: 'bg-green-500',
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading OSSB request...</p>
        </div>
      </div>
    )
  }

  if (!ossb) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">OSSB Request Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested OSSB could not be found.</p>
          <Button onClick={() => router.push('/user/ossb')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to OSSB Requests
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Professional Glassmorphism Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60"></div>
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/user/ossb')}
              className="border-slate-300 hover:bg-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{ossb.objectiveTitle}</h1>
              <p className="text-slate-600 font-mono text-sm mt-1">{ossb.referenceNo}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/user/ossb/${ossb.id}/edit`)}
                className="border-slate-300 hover:bg-white/80"
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
        </div>
      </div>

      {/* Status and Classification */}
      <div className="flex items-center gap-2">
        <Badge className={`${statusColors[ossb.status]} text-sm px-3 py-1`}>
          {ossb.status}
        </Badge>
        <Badge className={`${mipColors[ossb.mipClassification]} text-sm px-3 py-1`}>
          {ossb.mipClassification}
        </Badge>
        {ossb.partOfAnnualPlan && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            Annual Plan
          </Badge>
        )}
      </div>

      {/* Section 1: Header Information */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Header Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branch/Department</p>
              <p className="text-base">{ossb.branchOrDepartment}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Version No.</p>
              <p className="text-base">{ossb.versionNo || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Project Information */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Objective Statement</p>
            <p className="text-base mt-1">{ossb.titleObjective}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            {ossb.kraOrCpaNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">KRA/CPA Number</p>
                <p className="text-base">{ossb.kraOrCpaNumber}</p>
              </div>
            )}
            {ossb.kraOrCpaName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">KRA/CPA Name</p>
                <p className="text-base">{ossb.kraOrCpaName}</p>
              </div>
            )}
            {ossb.projectNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Number</p>
                <p className="text-base">{ossb.projectNumber}</p>
              </div>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-base">{formatDate(ossb.startDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">End Date</p>
              <p className="text-base">{formatDate(ossb.endDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Success Measures */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Success Measures / Specific Standards</CardTitle>
          <CardDescription className="text-slate-600">
            Measurable outcomes and standards for this objective
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            {ossb.successMeasures.map((measure, index) => (
              <li key={index} className="text-base">
                {measure}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Section 4: Program Steps and Budget */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Program Steps and Budget
          </CardTitle>
          <CardDescription className="text-slate-600">
            Total Budget: <span className="font-semibold text-lg text-emerald-600">{formatCurrency(ossb.totalBudget)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ossb.programSteps.map((step) => (
              <div key={step.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium">Step {step.stepNumber}</p>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {formatCurrency(step.budget)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsible:</span>
                    <span>{step.responsiblePerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Deadline:</span>
                    <span>{formatDate(step.deadline)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Signatories */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Signatories</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          {ossb.preparedBy && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prepared By</p>
              <p className="text-base font-medium">{ossb.preparedBy}</p>
              {ossb.preparedByPosition && <p className="text-sm text-muted-foreground">{ossb.preparedByPosition}</p>}
              {ossb.datePrepared && <p className="text-sm text-muted-foreground">{formatDate(ossb.datePrepared)}</p>}
            </div>
          )}
          {ossb.endorsedBy && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Endorsed By</p>
              <p className="text-base font-medium">{ossb.endorsedBy}</p>
              {ossb.endorsedByPosition && <p className="text-sm text-muted-foreground">{ossb.endorsedByPosition}</p>}
              {ossb.dateEndorsed && <p className="text-sm text-muted-foreground">{formatDate(ossb.dateEndorsed)}</p>}
            </div>
          )}
          {ossb.recommendedBy && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recommended By</p>
              <p className="text-base font-medium">{ossb.recommendedBy}</p>
              {ossb.recommendedByPosition && <p className="text-sm text-muted-foreground">{ossb.recommendedByPosition}</p>}
              {ossb.dateRecommended && <p className="text-sm text-muted-foreground">{formatDate(ossb.dateRecommended)}</p>}
            </div>
          )}
          {ossb.approvedBy && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved By</p>
              <p className="text-base font-medium">{ossb.approvedBy}</p>
              {ossb.approvedByPosition && <p className="text-sm text-muted-foreground">{ossb.approvedByPosition}</p>}
              {ossb.dateApproved && <p className="text-sm text-muted-foreground">{formatDate(ossb.dateApproved)}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6 & 7: Additional Information */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileText className="h-5 w-5 text-blue-600" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {ossb.hasGuidelines && (
              <Badge variant="outline">Has Guidelines Attached</Badge>
            )}
            {ossb.hasComputationValue && (
              <Badge variant="outline">Has Computation Value Attached</Badge>
            )}
          </div>
          {ossb.otherAttachments && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Other Attachments</p>
              <p className="text-base mt-1">{ossb.otherAttachments}</p>
            </div>
          )}
          {ossb.ccRecipients && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">CC Recipients</p>
              <p className="text-base mt-1">{ossb.ccRecipients}</p>
            </div>
          )}
          {ossb.remarks && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remarks</p>
              <p className="text-base mt-1">{ossb.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Created By</p>
            <p className="font-medium">{ossb.creator.name || ossb.creator.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created At</p>
            <p className="font-medium">{formatDate(ossb.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">{formatDate(ossb.updatedAt)}</p>
          </div>
          {ossb.submittedAt && (
            <div>
              <p className="text-muted-foreground">Submitted At</p>
              <p className="font-medium">{formatDate(ossb.submittedAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
