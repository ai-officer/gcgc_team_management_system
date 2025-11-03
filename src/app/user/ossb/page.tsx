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
import { Plus, MoreVertical, Eye, Edit, Trash2, Calendar, Filter } from 'lucide-react'
import OSSBWizardForm from '@/components/ossb/OSSBWizardForm'
import { toast } from 'sonner'

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
      toast.error('Failed to load OSSB requests')
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
      toast.success(result.message || 'OSSB request deleted successfully', {
        description: `Deleted ${result.details.tmsEventsDeleted} TMS calendar events and ${result.details.googleEventsDeleted} Google Calendar events`,
      })

      fetchOSSBRequests()
      setDeleteDialogOpen(false)
      setSelectedOSSB(null)
    } catch (error: any) {
      console.error('Error deleting OSSB:', error)
      toast.error('Failed to delete OSSB request', {
        description: error.message,
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading OSSB requests...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OSSB Requests</h1>
          <p className="text-muted-foreground">
            Manage your Objective/Specific Steps Budget requests
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create OSSB Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>
                {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No OSSB requests found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter === 'all'
                  ? 'Create your first OSSB request to get started'
                  : `No ${statusFilter.toLowerCase()} requests found`}
              </p>
              {statusFilter === 'all' && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create OSSB Request
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference No.</TableHead>
                    <TableHead>Objective Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total Budget</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((ossb) => (
                    <TableRow key={ossb.id} className="cursor-pointer hover:bg-muted/50">
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
