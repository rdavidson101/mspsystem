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
    where: { key: { in: ['mailgunApiKey', 'mailgunDomain', 'mailgunSupportEmail', 'mailgunUpdatesDomain', 'mailgunWebhookKey', 'mailgunEnabled'] } }
  })
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function getMailgunClient() {
  const settings = await getMailgunSettings()
  if (settings.mailgunEnabled !== 'true' || !settings.mailgunApiKey) return null
  const mg = new Mailgun(FormData)
  return { client: mg.client({ username: 'api', key: settings.mailgunApiKey }), settings }
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

export async function getTaskCcAddress(taskId: string, userId: string): Promise<string | null> {
  const settings = await getMailgunSettings()
  if (settings.mailgunEnabled !== 'true') return null
  const updatesDomain = settings.mailgunUpdatesDomain || settings.mailgunDomain
  if (!updatesDomain) return null
  const token = taskUserToken(taskId, userId)
  return `task+${token}@${updatesDomain}`
}
