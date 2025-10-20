import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

// POST - Setup webhook for Google Calendar notifications
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!syncSettings?.isEnabled) {
      return NextResponse.json({ error: 'Calendar sync not enabled' }, { status: 400 })
    }

    // Get the webhook URL from environment or construct it
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/calendar/webhook`

    try {
      // Stop existing webhook if any
      if (syncSettings.webhookChannelId && syncSettings.webhookResourceId) {
        try {
          await googleCalendarService.stopWatchingCalendar(
            session.user.id,
            syncSettings.webhookChannelId,
            syncSettings.webhookResourceId
          )
        } catch (error) {
          console.log('Failed to stop existing webhook (may already be stopped):', error)
        }
      }

      // Create new webhook
      const channelInfo = await googleCalendarService.subscribeToCalendar(
        session.user.id,
        syncSettings.googleCalendarId || 'primary',
        webhookUrl
      )

      // Update database with webhook info
      await prisma.calendarSyncSettings.update({
        where: { userId: session.user.id },
        data: {
          webhookChannelId: channelInfo.channelId,
          webhookResourceId: channelInfo.resourceId,
          webhookExpiration: channelInfo.expiration
            ? new Date(parseInt(channelInfo.expiration.toString()))
            : null
        }
      })

      return NextResponse.json({
        success: true,
        channelId: channelInfo.channelId,
        expiration: channelInfo.expiration
      })
    } catch (error: any) {
      console.error('Error setting up webhook:', error)
      return NextResponse.json(
        { error: 'Failed to setup webhook', details: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Webhook setup error:', error)
    return NextResponse.json({ error: 'Failed to setup webhook' }, { status: 500 })
  }
}

// DELETE - Stop webhook notifications
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!syncSettings?.webhookChannelId || !syncSettings?.webhookResourceId) {
      return NextResponse.json({ error: 'No active webhook found' }, { status: 400 })
    }

    try {
      await googleCalendarService.stopWatchingCalendar(
        session.user.id,
        syncSettings.webhookChannelId,
        syncSettings.webhookResourceId
      )

      // Clear webhook info from database
      await prisma.calendarSyncSettings.update({
        where: { userId: session.user.id },
        data: {
          webhookChannelId: null,
          webhookResourceId: null,
          webhookExpiration: null
        }
      })

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Error stopping webhook:', error)
      return NextResponse.json(
        { error: 'Failed to stop webhook', details: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Webhook deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}

// GET - Check webhook status and renew if needed
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!syncSettings) {
      return NextResponse.json({ webhookActive: false })
    }

    // Check if webhook is expiring soon (within 1 hour)
    const now = new Date()
    const expiringSoon = syncSettings.webhookExpiration
      ? syncSettings.webhookExpiration.getTime() - now.getTime() < 3600000
      : false

    return NextResponse.json({
      webhookActive: !!syncSettings.webhookChannelId,
      channelId: syncSettings.webhookChannelId,
      expiration: syncSettings.webhookExpiration,
      expiringSoon
    })
  } catch (error) {
    console.error('Webhook status error:', error)
    return NextResponse.json({ error: 'Failed to check webhook status' }, { status: 500 })
  }
}
