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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Plus, MoreVertical, Eye, Edit, Trash2, Calendar, Filter, FileText } from 'lucide-react'
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading OSSB requests...</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">OSSB Requests</h1>
              <p className="text-slate-600 text-base font-medium max-w-2xl">
                Manage your Objective/Specific Steps Budget requests
              </p>
            </div>
            <Button
              disabled
              className="bg-slate-400 cursor-not-allowed text-white shadow-md opacity-60"
              title="OSSB Request feature is temporarily disabled"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create OSSB Request (Disabled)
            </Button>
          </div>
        </div>
      </div>

      {/* Professional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Requests</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{ossbRequests.length}</div>
            <p className="text-xs text-slate-500 mt-1">All OSSB requests</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Approved</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Calendar className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {ossbRequests.filter(r => r.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Approved requests</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Pending</CardTitle>
            <div className="p-2.5 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {ossbRequests.filter(r => ['SUBMITTED', 'ENDORSED', 'RECOMMENDED'].includes(r.status)).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-500 to-slate-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Draft</CardTitle>
            <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
              <Edit className="h-5 w-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {ossbRequests.filter(r => r.status === 'DRAFT').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Draft requests</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">All Requests</CardTitle>
              <CardDescription className="text-slate-600">
                {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] border-slate-200">
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
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Incoming feature</h3>
              <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
                OSSB Request feature is currently under development and will be available soon.
              </p>
              {statusFilter === 'all' && (
                <Button
                  disabled
                  className="bg-slate-400 cursor-not-allowed text-white opacity-60"
                  title="OSSB Request feature is temporarily disabled"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create OSSB Request (Disabled)
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Reference No.</TableHead>
                    <TableHead className="font-semibold text-slate-700">Objective Title</TableHead>
                    <TableHead className="font-semibold text-slate-700">Department</TableHead>
                    <TableHead className="font-semibold text-slate-700">Classification</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Period</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Total Budget</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((ossb) => (
                    <TableRow
                      key={ossb.id}
                      className="cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="font-mono text-sm">{ossb.referenceNo}</TableCell>
                      <TableCell className="font-medium max-w-md truncate">
                        {ossb.objectiveTitle}
                      </TableCell>
                      <TableCell className="text-sm">{ossb.branchOrDepartment}</TableCell>
                      <TableCell>
                        <Badge className={mipColors[ossb.mipClassification]}>
                          {ossb.mipClassification}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ossb.status]}>
                          {ossb.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(ossb.startDate)} - {formatDate(ossb.endDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(ossb.totalBudget)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
        </CardContent>
      </Card>

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
