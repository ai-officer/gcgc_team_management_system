import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ossbRequestSchema } from '@/lib/validations/ossb'

/**
 * GET /api/ossb
 * Fetch all OSSB requests for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}

    // Filter by creator for regular users
    if (session.user.role !== 'ADMIN') {
      where.creatorId = session.user.id
    }

    // Filter by status if provided
    if (status) {
      where.status = status
    }

    const ossbRequests = await prisma.oSSBRequest.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      ossbRequests
    })
  } catch (error) {
    console.error('Error fetching OSSB requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OSSB requests' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ossb
 * Create a new OSSB request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Create OSSB request with program steps
    const ossbRequest = await prisma.oSSBRequest.create({
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
        creatorId: session.user.id,
        submittedAt: validatedData.status === 'SUBMITTED' ? new Date() : undefined,

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
      message: 'OSSB request created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating OSSB request:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create OSSB request' },
      { status: 500 }
    )
  }
}
