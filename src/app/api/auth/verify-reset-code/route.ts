import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, code } = verifyCodeSchema.parse(body)

    // Find the verification token for this email
    const tokens = await prisma.verificationToken.findMany({
      where: { identifier: email },
    })

    if (tokens.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    // Find a matching, non-expired token
    let validToken = null
    for (const token of tokens) {
      if (token.expires < new Date()) continue
      const isMatch = await bcrypt.compare(code, token.token)
      if (isMatch) {
        validToken = token
        break
      }
    }

    if (!validToken) {
      return NextResponse.json(
        { message: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    // Delete the used OTP token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: validToken.identifier,
          token: validToken.token,
        },
      },
    })

    // Generate a reset token for the password reset step
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedResetToken = await bcrypt.hash(resetToken, 10)

    // Store reset token with reset: prefix identifier, 10-minute expiry
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token: hashedResetToken,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return NextResponse.json({
      message: 'Code verified successfully.',
      resetToken,
    })
  } catch (error) {
    console.error('Verify reset code error:', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
