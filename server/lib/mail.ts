import { env } from '../config/env.ts'
import { logError } from './log.ts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

let missingKeyWarned = false

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function trackUrl(ticketNumber: string) {
  return `${env.publicSiteUrl}/track?ticket=${encodeURIComponent(ticketNumber)}`
}

export async function sendTicketEmailIfRequested(input: {
  email?: string | null
  ticketNumber: string
}) {
  const to = input.email?.trim().toLowerCase() ?? ''
  if (!to || !EMAIL_PATTERN.test(to)) return
  if (!env.resendApiKey) {
    if (!missingKeyWarned) {
      missingKeyWarned = true
      console.warn('[tingog:mail] RESEND_API_KEY is not set; ticket emails are skipped.')
    }
    return
  }

  const ticketNumber = input.ticketNumber
  const link = trackUrl(ticketNumber)
  const text = [
    `Your Tingog Page ticket number is ${ticketNumber}.`,
    '',
    `Track your report: ${link}`,
    '',
    'Keep this number. The public track page shows status only — not your name or contact details.',
    '',
    'Kidapawan City · Tingog Page',
  ].join('\n')
  const safeTicket = escapeHtml(ticketNumber)
  const safeLink = escapeHtml(link)
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f7f4ec;font-family:Georgia,serif;color:#1c1917;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d3;border-radius:12px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#194631;">Kidapawan City</p>
          <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;">Your report was received</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 24px;">
          <p style="margin:0 0 8px;font-size:14px;color:#57534e;">Ticket number</p>
          <p style="margin:0;font-family:ui-monospace,Consolas,monospace;font-size:26px;font-weight:700;color:#194631;letter-spacing:0.04em;">${safeTicket}</p>
          <p style="margin:16px 0 0;font-size:15px;line-height:1.55;color:#44403c;">
            Save this number. Use it to check the status of your report. Personal information is never shown on the public track page.
          </p>
          <p style="margin:22px 0 0;">
            <a href="${safeLink}" style="display:inline-block;background:#194631;color:#f7f4ec;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Track your report</a>
          </p>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#78716c;">
            Tingog Page does not send other updates to this address unless you submit another report with an email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TingogPage/1.0',
      },
      body: JSON.stringify({
        from: env.resendFrom,
        to: [to],
        subject: `Your Tingog Page ticket ${ticketNumber}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (response.ok) {
      const sent = (await response.json().catch(() => null)) as { id?: string } | null
      console.log('[tingog:mail] ticket email accepted', sent?.id ?? '')
      return
    }

    const body = (await response.json().catch(() => null)) as { message?: string } | null
    logError('mail.ticket', {
      message: body?.message ?? `Resend status ${response.status}`,
      code: String(response.status),
    })
  } catch (error) {
    logError('mail.ticket', error)
  }
}
