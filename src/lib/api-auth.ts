import { NextRequest } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { authOptions } from '@/lib/auth'

/**
 * Resolve the requesting user from EITHER a programmatic bearer token (mobile / API
 * clients) OR the web's NextAuth session cookie.
 *
 * Returns a NextAuth-`Session`-shaped object so existing route handlers can swap
 * `getServerSession(authOptions)` → `getRequestSession(req)` with no other changes.
 *
 * Bearer tokens are the HS256 JWTs issued by `POST /api/v1/auth/login` (signed with
 * `NEXTAUTH_SECRET`). Behavior:
 *  - If an `Authorization: Bearer <token>` header is present, verify it. Valid → user.
 *    Invalid/expired → return `null` (an explicit 401 — we do NOT fall back to the cookie).
 *  - If no bearer header, fall back to the cookie session (`getServerSession`).
 *
 * Security: the algorithm is pinned to HS256 to prevent algorithm-confusion attacks.
 */
export async function getRequestSession(req: NextRequest): Promise<Session | null> {
  const authHeader = req.headers.get('authorization')

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token || !process.env.NEXTAUTH_SECRET) return null
    try {
      const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload & {
        id?: string
        email?: string
        name?: string | null
        role?: string
        hierarchyLevel?: string | null
        image?: string | null
      }
      if (!payload?.id) return null
      return {
        user: {
          id: payload.id,
          email: payload.email ?? null,
          name: payload.name ?? null,
          image: payload.image ?? null,
          role: payload.role,
          hierarchyLevel: payload.hierarchyLevel ?? null,
        },
        expires: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : new Date(Date.now() + 3_600_000).toISOString(),
      } as Session
    } catch {
      // Bad signature / expired / malformed → unauthorized (no cookie fallback).
      return null
    }
  }

  // No bearer token → web session cookie.
  return getServerSession(authOptions)
}
