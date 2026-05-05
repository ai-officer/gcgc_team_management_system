import { NextRequest, NextResponse } from 'next/server'
import { Prisma, UserRole, HierarchyLevel } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { rowsToCsv, csvFilename, type CsvColumn } from '@/lib/csv-export'

const MAX_EXPORT_ROWS = 10_000

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') as UserRole | null
    const hierarchyLevel = searchParams.get('hierarchyLevel') as HierarchyLevel | null
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
      ...(hierarchyLevel && { hierarchyLevel }),
      ...(!includeInactive && { isActive: true }),
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        name: true,
        contactNumber: true,
        role: true,
        hierarchyLevel: true,
        division: true,
        department: true,
        section: true,
        team: true,
        positionTitle: true,
        jobLevel: true,
        isLeader: true,
        isActive: true,
        createdAt: true,
        reportsTo: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
    })

    type Row = (typeof users)[number]
    const columns: CsvColumn<Row>[] = [
      { key: 'username', header: 'Username', value: r => r.username ?? '' },
      { key: 'email', header: 'Email', value: r => r.email },
      { key: 'firstName', header: 'First Name', value: r => r.firstName ?? '' },
      { key: 'lastName', header: 'Last Name', value: r => r.lastName ?? '' },
      { key: 'middleName', header: 'Middle Name', value: r => r.middleName ?? '' },
      { key: 'contactNumber', header: 'Contact Number', value: r => r.contactNumber ?? '' },
      { key: 'role', header: 'Role', value: r => r.role },
      { key: 'hierarchyLevel', header: 'Hierarchy Level', value: r => r.hierarchyLevel ?? '' },
      { key: 'positionTitle', header: 'Position', value: r => r.positionTitle ?? '' },
      { key: 'jobLevel', header: 'Job Level', value: r => r.jobLevel ?? '' },
      { key: 'isLeader', header: 'Is Leader', value: r => r.isLeader ? 'Yes' : 'No' },
      { key: 'isActive', header: 'Active', value: r => r.isActive ? 'Yes' : 'No' },
      { key: 'division', header: 'Division', value: r => r.division ?? '' },
      { key: 'department', header: 'Department', value: r => r.department ?? '' },
      { key: 'section', header: 'Section', value: r => r.section ?? '' },
      { key: 'team', header: 'Team', value: r => r.team ?? '' },
      {
        key: 'reportsTo',
        header: 'Reports To',
        value: r => r.reportsTo
          ? `${r.reportsTo.firstName ?? ''} ${r.reportsTo.lastName ?? ''}`.trim() || r.reportsTo.email
          : '',
      },
      { key: 'createdAt', header: 'Created At', value: r => r.createdAt.toISOString() },
    ]

    const csv = rowsToCsv(users, columns)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename('users')}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('User export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
