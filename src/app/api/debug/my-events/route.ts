import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = await prisma.event.findMany({
      where: {
        creatorId: session.user.id
      },
      select: {
        id: true,
        title: true,
        type: true,
        startTime: true,
        endTime: true,
        googleCalendarEventId: true,
        googleCalendarId: true,
        syncedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json({
      userId: session.user.id,
      totalEvents: events.length,
      events: events.map(e => ({
        title: e.title,
        type: e.type,
        dates: `${e.startTime.toISOString()} → ${e.endTime.toISOString()}`,
        synced: !!e.googleCalendarEventId,
        googleEventId: e.googleCalendarEventId,
        syncedAt: e.syncedAt
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
