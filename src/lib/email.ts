import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM || 'notifications@hotelsogo-ai.com'

export function renderNotificationEmail(n: { title: string; message: string; url?: string }): { subject: string; html: string } {
  const button = n.url
    ? `<p style="margin:20px 0"><a href="${n.url}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open in GCGC TMS</a></p>`
    : ''
  const html = `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
    <h2 style="font-size:16px;margin:0 0 8px">${n.title}</h2>
    <p style="font-size:14px;color:#334155;margin:0">${n.message}</p>
    ${button}
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">You're receiving this from GCGC TMS. Manage notifications in your profile settings.</p>
  </div>`
  return { subject: `GCGC TMS · ${n.title}`, html }
}

export async function sendNotificationEmail(to: string, n: { title: string; message: string; url?: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) { console.info('[email] RESEND_API_KEY unset — skipping email to', to); return }
  const { subject, html } = renderNotificationEmail(n)
  const resend = new Resend(key)
  await resend.emails.send({ from: FROM, to, subject, html })
}
