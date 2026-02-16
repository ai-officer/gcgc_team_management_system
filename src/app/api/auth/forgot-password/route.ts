import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { sendPasswordResetCode } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account exists with this email, a reset code has been sent.',
    })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return successResponse

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()
    const hashedCode = await bcrypt.hash(code, 10)

    // Delete any existing OTP tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    })

    // Store hashed code with 10-minute expiry
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashedCode,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    // Send email with plaintext code
    await sendPasswordResetCode(email, code)

    return successResponse
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
