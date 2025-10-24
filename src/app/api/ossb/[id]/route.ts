import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ossbRequestSchema } from '@/lib/validations/ossb'

/**
 * GET /api/ossb/[id]
 * Fetch a single OSSB request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const ossbRequest = await prisma.oSSBRequest.findUnique({
      where: {
        id: params.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        programSteps: {
          orderBy: {
            stepNumber: 'asc'
          }
        },
        attachments: true
      }
    })

    if (!ossbRequest) {
      return NextResponse.json(
        { error: 'OSSB request not found' },
        { status: 404 }
      )
    }

    // Check permissions: only creator or admin can view
    if (
      session.user.role !== 'ADMIN' &&
      ossbRequest.creatorId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({ ossbRequest })
  } catch (error) {
    console.error('Error fetching OSSB request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OSSB request' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ossb/[id]
 * Update an existing OSSB request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if OSSB request exists
    const existingRequest = await prisma.oSSBRequest.findUnique({
      where: { id: params.id },
      include: { programSteps: true }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'OSSB request not found' },
        { status: 404 }
      )
    }

    // Check permissions: only creator or admin can update
    if (
      session.user.role !== 'ADMIN' &&
      existingRequest.creatorId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = ossbRequestSchema.parse(body)

    // Calculate total budget from program steps
    const totalBudget = validatedData.programSteps.reduce(
      (sum, step) => sum + step.budget,
      0
    )

    // Delete existing program steps and create new ones
    await prisma.oSSBProgramStep.deleteMany({
      where: { ossbRequestId: params.id }
    })

    // Update OSSB request
    const ossbRequest = await prisma.oSSBRequest.update({
      where: { id: params.id },
      data: {
        // Section 1: Header Information
        branchOrDepartment: validatedData.branchOrDepartment,
        objectiveTitle: validatedData.objectiveTitle,
        versionNo: validatedData.versionNo,
        partOfAnnualPlan: validatedData.partOfAnnualPlan,

        // Section 2: Project Information
        mipClassification: validatedData.mipClassification,
        kraOrCpaNumber: validatedData.kraOrCpaNumber,
        projectNumber: validatedData.projectNumber,
        kraOrCpaName: validatedData.kraOrCpaName,
        titleObjective: validatedData.titleObjective,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,

        // Section 3: Success Measures
        successMeasures: validatedData.successMeasures,

        // Section 4: Total Budget
        totalBudget,

        // Section 5: Signatories
        preparedBy: validatedData.preparedBy,
        preparedByPosition: validatedData.preparedByPosition,
        datePrepared: validatedData.datePrepared,
        endorsedBy: validatedData.endorsedBy,
        endorsedByPosition: validatedData.endorsedByPosition,
        dateEndorsed: validatedData.dateEndorsed,
        recommendedBy: validatedData.recommendedBy,
        recommendedByPosition: validatedData.recommendedByPosition,
        dateRecommended: validatedData.dateRecommended,
        approvedBy: validatedData.approvedBy,
        approvedByPosition: validatedData.approvedByPosition,
        dateApproved: validatedData.dateApproved,

        // Section 6: Attachments
        hasGuidelines: validatedData.hasGuidelines,
        hasComputationValue: validatedData.hasComputationValue,
        otherAttachments: validatedData.otherAttachments,

        // Section 7: CC/Remarks
        ccRecipients: validatedData.ccRecipients,
        remarks: validatedData.remarks,

        // Meta fields
        status: validatedData.status,
        submittedAt:
          validatedData.status === 'SUBMITTED' && !existingRequest.submittedAt
            ? new Date()
            : existingRequest.submittedAt,

        // Create program steps
        programSteps: {
          create: validatedData.programSteps
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        programSteps: {
          orderBy: {
            stepNumber: 'asc'
          }
        },
        attachments: true
      }
    })

    return NextResponse.json({
      ossbRequest,
      message: 'OSSB request updated successfully'
    })
  } catch (error) {
    console.error('Error updating OSSB request:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update OSSB request' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ossb/[id]
 * Delete an OSSB request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if OSSB request exists
    const existingRequest = await prisma.oSSBRequest.findUnique({
      where: { id: params.id }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'OSSB request not found' },
        { status: 404 }
      )
    }

    // Check permissions: only creator or admin can delete
    if (
      session.user.role !== 'ADMIN' &&
      existingRequest.creatorId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete OSSB request (cascade will delete program steps and attachments)
    await prisma.oSSBRequest.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'OSSB request deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting OSSB request:', error)
    return NextResponse.json(
      { error: 'Failed to delete OSSB request' },
      { status: 500 }
    )
  }
}
