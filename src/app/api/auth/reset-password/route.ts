import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const resetPasswordApiSchema = z
  .object({
    email: z.string().email(),
    resetToken: z.string().min(1),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, resetToken, password } = resetPasswordApiSchema.parse(body)

    // Find the reset token
    const tokens = await prisma.verificationToken.findMany({
      where: { identifier: `reset:${email}` },
    })

    if (tokens.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token. Please start over.' },
        { status: 400 }
      )
    }

    // Find a matching, non-expired token
    let validToken = null
    for (const token of tokens) {
      if (token.expires < new Date()) continue
      const isMatch = await bcrypt.compare(resetToken, token.token)
      if (isMatch) {
        validToken = token
        break
      }
    }

    if (!validToken) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token. Please start over.' },
        { status: 400 }
      )
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })

    // Delete the used reset token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: validToken.identifier,
          token: validToken.token,
        },
      },
    })

    return NextResponse.json({
      message: 'Password reset successfully. You can now sign in.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
