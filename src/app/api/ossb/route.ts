import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ossbRequestSchema } from '@/lib/validations/ossb'
import { EventType, MIPClassification } from '@prisma/client'
import { googleCalendarService } from '@/lib/google-calendar'

/**
 * Helper function to create a detailed event description for OSSB projects
 */
function createOSSBEventDescription(ossbData: any, referenceNo: string): string {
  let description = `OSSB Project: ${ossbData.objectiveTitle}\n\n`
  description += `Reference No: ${referenceNo}\n`
  description += `Classification: ${ossbData.mipClassification}\n`
  description += `Branch/Department: ${ossbData.branchOrDepartment}\n\n`

  if (ossbData.titleObjective) {
    description += `Objective Statement:\n${ossbData.titleObjective}\n\n`
  }

  description += `Success Measures:\n`
  ossbData.successMeasures.forEach((measure: string, index: number) => {
    description += `${index + 1}. ${measure}\n`
  })

  if (ossbData.totalBudget > 0) {
    description += `\nTotal Budget: ₱${ossbData.totalBudget.toLocaleString()}\n`
  }

  description += `\nStatus: ${ossbData.status}`

  return description
}

/**
 * Helper function to get color for MIP classification
 */
function getMIPColor(classification: MIPClassification): string {
  switch (classification) {
    case 'MAINTENANCE':
      return '#3b82f6' // Blue
    case 'IMPROVEMENT':
      return '#f59e0b' // Orange
    case 'PROJECT':
      return '#8b5cf6' // Purple
    default:
      return '#6b7280' // Gray
  }
}

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
    console.log('📥 Received OSSB request body:', JSON.stringify(body, null, 2))

    // Validate input
    try {
      const validatedData = ossbRequestSchema.parse(body)
      console.log('✅ Validation passed')
    } catch (validationError: any) {
      console.error('❌ Validation failed:', validationError.errors || validationError)
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationError.errors || validationError.message
        },
        { status: 400 }
      )
    }

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

    // Create calendar events for the OSSB project
    const createdEvents: any[] = []
    try {
      // 1. Create main project event (startDate to endDate)
      const projectEvent = await prisma.event.create({
        data: {
          title: `[OSSB] ${validatedData.objectiveTitle}`,
          description: createOSSBEventDescription(validatedData, ossbRequest.referenceNo),
          startTime: validatedData.startDate,
          endTime: validatedData.endDate,
          allDay: true,
          type: EventType.MILESTONE,
          color: getMIPColor(validatedData.mipClassification),
          creatorId: session.user.id,
        }
      })
      createdEvents.push(projectEvent)

      // 2. Create milestone events for each success measure
      // Distribute success measures evenly across the project timeline
      const projectDuration = validatedData.endDate.getTime() - validatedData.startDate.getTime()
      const successMeasureCount = validatedData.successMeasures.length
      const milestoneInterval = projectDuration / (successMeasureCount + 1)

      const successMeasureEvents = await Promise.all(
        validatedData.successMeasures.map((measure, index) => {
          const milestoneDate = new Date(
            validatedData.startDate.getTime() + milestoneInterval * (index + 1)
          )

          return prisma.event.create({
            data: {
              title: `[OSSB Milestone] ${validatedData.objectiveTitle} - Measure ${index + 1}`,
              description: `Success Measure ${index + 1}: ${measure}\n\nProject: ${validatedData.objectiveTitle}\nReference: ${ossbRequest.referenceNo}`,
              startTime: milestoneDate,
              endTime: milestoneDate,
              allDay: true,
              type: EventType.MILESTONE,
              color: '#10b981', // Green for success milestones
              creatorId: session.user.id,
            }
          })
        })
      )
      createdEvents.push(...successMeasureEvents)

      console.log(`✅ Created ${createdEvents.length} TMS calendar events for OSSB ${ossbRequest.referenceNo}`)

      // 3. Automatically sync to Google Calendar if enabled
      const syncSettings = await prisma.calendarSyncSettings.findUnique({
        where: { userId: session.user.id }
      })

      if (syncSettings?.isEnabled && syncSettings.syncDirection !== 'GOOGLE_TO_TMS') {
        console.log(`🔄 Syncing OSSB events to Google Calendar for user ${session.user.id}`)

        // Get or create TMS_CALENDAR
        let calendarId = syncSettings.googleCalendarId
        if (!calendarId || calendarId === 'primary') {
          try {
            calendarId = await googleCalendarService.findOrCreateTMSCalendar(session.user.id)
            await prisma.calendarSyncSettings.update({
              where: { userId: session.user.id },
              data: { googleCalendarId: calendarId }
            })
          } catch (error) {
            console.error('❌ Error finding/creating TMS_CALENDAR:', error)
            calendarId = syncSettings.googleCalendarId || 'primary'
          }
        }

        // Sync each event to Google Calendar
        let syncedCount = 0
        for (const event of createdEvents) {
          try {
            const googleEvent = googleCalendarService.convertTMSEventToGoogle(event)
            const createdGoogleEvent = await googleCalendarService.createEvent(
              session.user.id,
              googleEvent,
              calendarId
            )

            // Update local event with Google Calendar IDs
            await prisma.event.update({
              where: { id: event.id },
              data: {
                googleCalendarId: calendarId,
                googleCalendarEventId: createdGoogleEvent.id!,
                syncedAt: new Date()
              }
            })

            syncedCount++
          } catch (syncError: any) {
            console.error(`❌ Error syncing event "${event.title}" to Google Calendar:`, syncError.message)
          }
        }

        console.log(`✅ Synced ${syncedCount}/${createdEvents.length} OSSB events to Google Calendar`)

        // Update last synced timestamp
        await prisma.calendarSyncSettings.update({
          where: { userId: session.user.id },
          data: { lastSyncedAt: new Date() }
        })
      } else {
        console.log(`ℹ️  Google Calendar sync not enabled for user ${session.user.id}`)
      }
    } catch (calendarError) {
      // Log error but don't fail the OSSB creation
      console.error('❌ Error creating/syncing calendar events for OSSB:', calendarError)
    }

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
