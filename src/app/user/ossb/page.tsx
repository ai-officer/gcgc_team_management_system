'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Plus, MoreVertical, Eye, Edit, Trash2, FileText, ClipboardList } from 'lucide-react'
import OSSBWizardForm from '@/components/ossb/OSSBWizardForm'
import { useToast } from '@/hooks/use-toast'

type OSSBStatus = 'DRAFT' | 'SUBMITTED' | 'ENDORSED' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED'
type MIPClassification = 'MAINTENANCE' | 'IMPROVEMENT' | 'PROJECT'

interface OSSBRequest {
  id: string
  referenceNo: string
  objectiveTitle: string
  branchOrDepartment: string
  mipClassification: MIPClassification
  status: OSSBStatus
  startDate: string
  endDate: string
  totalBudget: number
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string | null
  }
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

export default function OSSBManagementPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [ossbRequests, setOssbRequests] = useState<OSSBRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<OSSBRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedOSSB, setSelectedOSSB] = useState<OSSBRequest | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchOSSBRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ossb')
      if (!response.ok) throw new Error('Failed to fetch OSSB requests')
      const data = await response.json()
      setOssbRequests(data.ossbRequests || [])
      setFilteredRequests(data.ossbRequests || [])
    } catch (error) {
      console.error('Error fetching OSSB requests:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load OSSB requests',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOSSBRequests()
  }, [])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredRequests(ossbRequests)
    } else {
      setFilteredRequests(ossbRequests.filter(r => r.status === statusFilter))
    }
  }, [statusFilter, ossbRequests])

  const handleDelete = async () => {
    if (!selectedOSSB) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/ossb/${selectedOSSB.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete OSSB request')

      const result = await response.json()
      toast({
        title: 'Success',
        description: `${result.message}. Deleted ${result.details.tmsEventsDeleted} TMS events and ${result.details.googleEventsDeleted} Google events.`,
      })

      fetchOSSBRequests()
      setDeleteDialogOpen(false)
      setSelectedOSSB(null)
    } catch (error: any) {
      console.error('Error deleting OSSB:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete OSSB request: ${error.message}`,
      })
    } finally {
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
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading OSSB requests...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OSSB Requests</h1>
          <p className="text-sm text-gray-600 mt-0.5">Manage your Objective/Specific Steps Budget requests</p>
        </div>
        <Button
          disabled
          className="bg-slate-400 cursor-not-allowed text-white opacity-60"
          title="OSSB Request feature is temporarily disabled"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Request (Disabled)
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Requests</p>
          <p className="text-3xl font-bold text-gray-900">{ossbRequests.length}</p>
          <p className="text-xs text-gray-500 mt-1">All OSSB requests</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Approved</p>
          <p className="text-3xl font-bold text-gray-900">
            {ossbRequests.filter(r => r.status === 'APPROVED').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Approved requests</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Pending</p>
          <p className="text-3xl font-bold text-gray-900">
            {ossbRequests.filter(r => ['SUBMITTED', 'ENDORSED', 'RECOMMENDED'].includes(r.status)).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Draft</p>
          <p className="text-3xl font-bold text-gray-900">
            {ossbRequests.filter(r => r.status === 'DRAFT').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Draft requests</p>
        </div>
      </div>

      {/* Filter Bar + Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filter Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-lg font-semibold text-gray-900">All Requests</p>
            <p className="text-sm text-gray-600">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] border-gray-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="ENDORSED">Endorsed</SelectItem>
              <SelectItem value="RECOMMENDED">Recommended</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table or Empty State */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
              <ClipboardList className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No OSSB requests yet</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              OSSB Request feature is currently under development and will be available soon.
            </p>
            {statusFilter === 'all' && (
              <Button
                disabled
                className="bg-slate-400 cursor-not-allowed text-white opacity-60"
                title="OSSB Request feature is temporarily disabled"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first request (Disabled)
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Reference No.</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Objective Title</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Department</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Classification</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Period</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-right">Total Budget</TableHead>
                  <TableHead className="w-[56px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {filteredRequests.map((ossb) => (
                  <TableRow
                    key={ossb.id}
                    className="hover:bg-gray-50 transition-colors px-4 py-3"
                  >
                    <TableCell className="font-mono text-sm px-4 py-3">{ossb.referenceNo}</TableCell>
                    <TableCell className="font-medium text-sm max-w-xs truncate px-4 py-3">
                      {ossb.objectiveTitle}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 px-4 py-3">{ossb.branchOrDepartment}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={`${mipColors[ossb.mipClassification]} border-0 text-xs font-medium`}>
                        {ossb.mipClassification}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={`${statusColors[ossb.status]} border-0 text-xs font-medium`}>
                        {ossb.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 px-4 py-3">
                      {formatDate(ossb.startDate)} &ndash; {formatDate(ossb.endDate)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium px-4 py-3">
                      {formatCurrency(ossb.totalBudget)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => router.push(`/user/ossb/${ossb.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/user/ossb/${ossb.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedOSSB(ossb)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create OSSB Dialog */}
      <OSSBWizardForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false)
          fetchOSSBRequests()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OSSB Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the OSSB request <strong>{selectedOSSB?.referenceNo}</strong> and all associated calendar events (both TMS and Google Calendar). This action cannot be undone.
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
