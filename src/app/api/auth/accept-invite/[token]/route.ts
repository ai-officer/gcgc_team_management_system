import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import {
  AdminActionType,
  HierarchyLevel,
  InvitationStatus,
  Prisma,
  UserRole,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'

const acceptSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  contactNumber: z
    .string()
    .min(1, 'Contact number is required')
    .refine(v => /^09\d{9}$/.test(v), {
      message: 'Contact number must start with 09 and be exactly 11 digits',
    }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

interface RouteParams {
  params: { token: string }
}

async function loadAndExpire(token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } })
  if (!invitation) return null
  if (
    invitation.status === InvitationStatus.PENDING &&
    invitation.expiresAt < new Date()
  ) {
    return prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.EXPIRED },
    })
  }
  return invitation
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const invitation = await loadAndExpire(params.token)
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json(
        { error: `This invitation has been ${invitation.status.toLowerCase()}` },
        { status: 410 }
      )
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        hierarchyLevel: invitation.hierarchyLevel,
        isLeader: invitation.isLeader,
        division: invitation.division,
        department: invitation.department,
        section: invitation.section,
        team: invitation.team,
        positionTitle: invitation.positionTitle,
        jobLevel: invitation.jobLevel,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error loading invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const body = await req.json()
    const parsed = acceptSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const invitation = await loadAndExpire(params.token)
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json(
        { error: `This invitation has been ${invitation.status.toLowerCase()}` },
        { status: 410 }
      )
    }

    const { firstName, lastName, middleName, username, contactNumber, password } = parsed.data

    // Username collision check (email is enforced unique by DB; we surface a friendlier error here for username).
    const existingByUsername = await prisma.user.findFirst({
      where: { username: username.trim() },
      select: { id: true },
    })
    if (existingByUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    })
    if (existingByEmail) {
      // The email already has an account — invalidate this invitation.
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
      })
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const role = invitation.isLeader ? UserRole.LEADER : invitation.role
    const hierarchyLevel = invitation.hierarchyLevel ?? HierarchyLevel.RF1

    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          middleName,
          name: `${firstName} ${lastName}`,
          email: invitation.email,
          username: username.trim(),
          contactNumber,
          password: hashedPassword,
          role,
          hierarchyLevel,
          isLeader: invitation.isLeader,
          division: invitation.division,
          department: invitation.department,
          section: invitation.section,
          team: invitation.team,
          positionTitle: invitation.positionTitle,
          jobLevel: invitation.jobLevel,
          reportsToId: invitation.isLeader ? null : invitation.reportsToId ?? null,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          hierarchyLevel: true,
        },
      })

      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      })

      return { user, invitation: updatedInvitation }
    })

    await logAdminAction({
      request: req,
      action: AdminActionType.INVITATION_ACCEPTED,
      description: `Invitation for ${invitation.email} was accepted`,
      adminId: null,
      adminUsername: invitation.createdByAdminUsername,
      targetType: 'Invitation',
      targetId: invitation.id,
      metadata: { newUserId: result.user.id },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field'
      return NextResponse.json(
        { error: `Duplicate ${target}` },
        { status: 400 }
      )
    }
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
