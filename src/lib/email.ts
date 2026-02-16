import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetCode(email: string, code: string) {
  await transporter.sendMail({
    from: `"GCGC Team Management" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Password Reset Code - GCGC TMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #2563eb; border-radius: 8px; line-height: 48px;">
            <span style="color: white; font-size: 20px; font-weight: bold;">G</span>
          </div>
          <h2 style="margin: 16px 0 4px; color: #111827; font-size: 20px;">Password Reset</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">GCGC Team Management System</p>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          You requested a password reset. Use the code below to verify your identity:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 8px; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #111827;">
            ${code}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
          This code expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `,
  })
}
