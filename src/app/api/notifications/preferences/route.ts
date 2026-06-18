// src/app/api/notifications/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailNotifications: true, pushNotifications: true } })
  return NextResponse.json(u ?? { emailNotifications: true, pushNotifications: true })
}

export async function PUT(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const data: { emailNotifications?: boolean; pushNotifications?: boolean } = {}
  if (typeof body.emailNotifications === 'boolean') data.emailNotifications = body.emailNotifications
  if (typeof body.pushNotifications === 'boolean') data.pushNotifications = body.pushNotifications
  const u = await prisma.user.update({ where: { id: session.user.id }, data, select: { emailNotifications: true, pushNotifications: true } })
  return NextResponse.json(u)
}
