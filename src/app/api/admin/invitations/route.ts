import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import {
  Prisma,
  AdminActionType,
  InvitationStatus,
  UserRole,
  HierarchyLevel,
} from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'
import { isAllowedEmailDomain, ALLOWED_EMAIL_MESSAGE } from '@/lib/allowed-email-domains'

const DEFAULT_EXPIRY_DAYS = 7

const createSchema = z.object({
  email: z
    .string()
    .email('Invalid email')
    .refine(isAllowedEmailDomain, { message: ALLOWED_EMAIL_MESSAGE }),
  role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
  hierarchyLevel: z.nativeEnum(HierarchyLevel).optional(),
  isLeader: z.boolean().default(false),
  division: z.string().optional(),
  department: z.string().optional(),
  section: z.string().optional(),
  team: z.string().optional(),
  positionTitle: z.string().optional(),
  jobLevel: z.string().optional(),
  reportsToId: z.string().optional(),
  expiresInDays: z.number().int().positive().max(30).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const skip = (page - 1) * limit
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const where: Prisma.InvitationWhereInput = {}
    if (status && Object.values(InvitationStatus).includes(status as InvitationStatus)) {
      where.status = status as InvitationStatus
    }
    if (search) {
      where.email = { contains: search, mode: 'insensitive' }
    }

    // Lazily mark expired invitations so the list reflects reality without a cron job.
    await prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    })

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invitation.count({ where }),
    ])

    return NextResponse.json({
      invitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    })
  } catch (error) {
    console.error('Error listing invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const normalizedEmail = data.email.trim().toLowerCase()

    // Block invitation if a user with this email already exists.
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Block if there's already an open invitation for this email — revoke first.
    const openInvite = await prisma.invitation.findFirst({
      where: {
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })
    if (openInvite) {
      return NextResponse.json(
        { error: 'An active invitation for this email already exists. Revoke it first.' },
        { status: 400 }
      )
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresInDays = data.expiresInDays ?? DEFAULT_EXPIRY_DAYS
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    const invitation = await prisma.invitation.create({
      data: {
        token,
        email: normalizedEmail,
        role: data.role,
        hierarchyLevel: data.hierarchyLevel,
        isLeader: data.isLeader,
        division: data.division,
        department: data.department,
        section: data.section,
        team: data.team,
        positionTitle: data.positionTitle,
        jobLevel: data.jobLevel,
        reportsToId: data.reportsToId,
        expiresAt,
        createdByAdminId: session.sub,
        createdByAdminUsername: session.username,
      },
    })

    const origin = req.headers.get('origin') ?? new URL(req.url).origin
    const acceptUrl = `${origin}/auth/accept-invite/${token}`

    await logAdminAction({
      request: req,
      action: AdminActionType.INVITATION_CREATED,
      description: `Created invitation for ${invitation.email}`,
      adminId: session.sub,
      adminUsername: session.username,
      targetType: 'Invitation',
      targetId: invitation.id,
      metadata: { role: invitation.role, expiresAt: invitation.expiresAt.toISOString() },
    })

    return NextResponse.json({ invitation, acceptUrl }, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
