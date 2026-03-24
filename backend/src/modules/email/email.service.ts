import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import { prisma } from '../../lib/prisma'
import { ticketReplyToken, taskUserToken } from './email.utils'

// Helper to format ticket ref
function fmtTicket(n: number) { return `INC-${String(n).padStart(5, '0')}` }

// Remove CRLF characters that could enable email header injection
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n\t]/g, ' ').trim().slice(0, 500)
}

// Escape user-provided content inserted into HTML email bodies to prevent XSS in email clients
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function getMailgunSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ['mailgunApiKey', 'mailgunDomain', 'mailgunSupportEmail', 'mailgunUpdatesDomain', 'mailgunWebhookKey', 'mailgunEnabled', 'mailgunRegion'] } }
  })
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function getMailgunClient() {
  const settings = await getMailgunSettings()
  if (settings.mailgunEnabled !== 'true' || !settings.mailgunApiKey) return null
  const mg = new Mailgun(FormData)
  const url = settings.mailgunRegion === 'EU' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
  return { client: mg.client({ username: 'api', key: settings.mailgunApiKey, url }), settings }
}

export async function sendTicketConfirmation(ticket: any, toEmail: string) {
  const result = await getMailgunClient()
  if (!result) return
  const { client, settings } = result
  const replyToken = ticketReplyToken(ticket.id)
  const updatesDomain = settings.mailgunUpdatesDomain || settings.mailgunDomain
  const replyTo = `ticket+${replyToken}@${updatesDomain}`
  const ref = fmtTicket(ticket.number)
  const safeTitle = escapeHtml(ticket.title)
  const safeRef = escapeHtml(ref)
  await client.messages.create(settings.mailgunDomain, {
    from: sanitizeHeader(`Support <${settings.mailgunSupportEmail}>`),
    to: sanitizeHeader(toEmail),
    subject: sanitizeHeader(`[${ref}] ${ticket.title} - Ticket Received`),
    'h:Reply-To': replyTo,
    text: `Hi,\n\nYour support ticket has been received and logged as ${ref}.\n\nSubject: ${ticket.title}\n\nWe'll be in touch shortly. To add more information, simply reply to this email.\n\nReference: ${ref}`,
    html: `<p>Hi,</p><p>Your support ticket has been received and logged as <strong>${safeRef}</strong>.</p><p><strong>Subject:</strong> ${safeTitle}</p><p>We'll be in touch shortly. To add more information to this ticket, simply reply to this email.</p><p><small>Reference: ${safeRef}</small></p>`
  }).catch((err: any) => console.error('Mailgun send error:', err))
}

export async function sendTicketUpdate(ticket: any, commentContent: string, toEmail: string, authorName: string) {
  const result = await getMailgunClient()
  if (!result) return
  const { client, settings } = result
  const replyToken = ticketReplyToken(ticket.id)
  const updatesDomain = settings.mailgunUpdatesDomain || settings.mailgunDomain
  const replyTo = `ticket+${replyToken}@${updatesDomain}`
  const ref = fmtTicket(ticket.number)
  const safeRef = escapeHtml(ref)
  const safeAuthor = escapeHtml(authorName)
  const safeTitle = escapeHtml(ticket.title)
  const safeContent = escapeHtml(commentContent).replace(/\n/g, '<br/>')
  await client.messages.create(settings.mailgunDomain, {
    from: sanitizeHeader(`Support <${settings.mailgunSupportEmail}>`),
    to: sanitizeHeader(toEmail),
    subject: sanitizeHeader(`Re: [${ref}] ${ticket.title}`),
    'h:Reply-To': replyTo,
    text: `${authorName} replied to your ticket ${ref}:\n\n${commentContent}\n\n---\nReply to this email to respond to this ticket.`,
    html: `<p><strong>${safeAuthor}</strong> has updated your ticket <strong>${safeRef}</strong>:</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0"/><p>${safeContent}</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0"/><p><small>Reply to this email to respond. Reference: ${safeRef}</small></p>`
  }).catch((err: any) => console.error('Mailgun send error:', err))
}

export async function sendTicketClosure(ticket: any, closureNote: string, toEmail: string, techName: string) {
  const result = await getMailgunClient()
  if (!result) return
  const { client, settings } = result
  const replyToken = ticketReplyToken(ticket.id)
  const updatesDomain = settings.mailgunUpdatesDomain || settings.mailgunDomain
  const replyTo = `ticket+${replyToken}@${updatesDomain}`
  const ref = fmtTicket(ticket.number)
  const safeRef = escapeHtml(ref)
  const safeTitle = escapeHtml(ticket.title)
  const safeTech = escapeHtml(techName)
  const safeNote = escapeHtml(closureNote).replace(/\n/g, '<br/>')
  await client.messages.create(settings.mailgunDomain, {
    from: sanitizeHeader(`Support <${settings.mailgunSupportEmail}>`),
    to: sanitizeHeader(toEmail),
    subject: sanitizeHeader(`[${ref}] ${ticket.title} - Ticket Closed`),
    'h:Reply-To': replyTo,
    text: `Hi,\n\nYour ticket ${ref} has been closed by ${techName}.\n\nClosure note:\n${closureNote}\n\nIf you believe your issue is not resolved, simply reply to this email and your ticket will be automatically reopened.\n\nReference: ${ref}`,
    html: `<p>Hi,</p><p>Your ticket <strong>${safeRef}</strong> has been closed by <strong>${safeTech}</strong>.</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0"/><p><strong>Closure note:</strong></p><p>${safeNote}</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0"/><p><small>If your issue is not resolved, simply reply to this email and your ticket will be automatically reopened. Reference: ${safeRef}</small></p>`
  }).catch((err: any) => console.error('Mailgun send error:', err))
}

export async function getTaskCcAddress(taskId: string, userId: string): Promise<string | null> {
  const settings = await getMailgunSettings()
  if (settings.mailgunEnabled !== 'true') return null
  const updatesDomain = settings.mailgunUpdatesDomain || settings.mailgunDomain
  if (!updatesDomain) return null
  const token = taskUserToken(taskId, userId)
  return `task+${token}@${updatesDomain}`
}

export async function sendChangeApprovalEmail(
  change: any,
  contact: { firstName: string; lastName: string; email: string },
  approveUrl: string,
  rejectUrl: string
) {
  const result = await getMailgunClient()
  if (!result) return
  const { client, settings } = result
  const ref = `RFC-${String(change.number).padStart(5, '0')}`

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#1e293b">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Change Request Awaiting Your Approval</h1>
        <p style="color:#c7d2fe;margin:6px 0 0">${ref} — ${change.title}</p>
      </div>
      <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p>Hi ${contact.firstName},</p>
        <p>A change request has been submitted that requires your approval. Please review the details below and approve or reject.</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;width:40%">Reference</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${ref}</td></tr>
          <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Title</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${change.title}</td></tr>
          <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Risk Level</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${change.risk}</td></tr>
          ${change.scheduledStart ? `<tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Scheduled</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${new Date(change.scheduledStart).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}${change.durationMinutes ? ` (~${change.durationMinutes} min)` : ''}</td></tr>` : ''}
          ${change.scope ? `<tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Scope</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${change.scope}</td></tr>` : ''}
          ${change.reason ? `<tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Reason</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${change.reason}</td></tr>` : ''}
          ${change.implementationPlan ? `<tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Implementation Plan</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;white-space:pre-wrap">${change.implementationPlan}</td></tr>` : ''}
          ${change.rollbackSteps ? `<tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Rollback Plan</td><td style="padding:8px 12px">${change.rollbackSteps}</td></tr>` : ''}
        </table>

        <div style="margin:32px 0;text-align:center">
          <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;margin-right:16px">&#10003; Approve</a>
          <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">&#10007; Reject</a>
        </div>

        <p style="font-size:13px;color:#64748b">You can also add a comment after clicking either button. This approval link is unique to you — please do not forward it.</p>
      </div>
    </div>
  `

  await client.messages.create(settings.mailgunDomain, {
    from: `${settings.mailgunFromName || 'Support'} <${settings.mailgunFromEmail || `support@${settings.mailgunDomain}`}>`,
    to: contact.email,
    subject: `[${ref}] Change Request Awaiting Your Approval: ${change.title}`,
    html,
  })
}
