import { NextRequest, NextResponse } from 'next/server'
import { AdminActionType, InvitationStatus } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
    })
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json(
        { error: `Cannot revoke an invitation that is ${invitation.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    const updated = await prisma.invitation.update({
      where: { id: params.id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    })

    await logAdminAction({
      request: req,
      action: AdminActionType.INVITATION_REVOKED,
      description: `Revoked invitation for ${invitation.email}`,
      adminId: session.sub,
      adminUsername: session.username,
      targetType: 'Invitation',
      targetId: invitation.id,
    })

    return NextResponse.json({ invitation: updated })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
