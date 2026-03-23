import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import { prisma } from '../../lib/prisma'
import { ticketReplyToken, taskUserToken } from './email.utils'

// Helper to format ticket ref
function fmtTicket(n: number) { return `INC-${String(n).padStart(5, '0')}` }

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
  await client.messages.create(settings.mailgunDomain, {
    from: `Support <${settings.mailgunSupportEmail}>`,
    to: toEmail,
    subject: `[${ref}] ${ticket.title} - Ticket Received`,
    'h:Reply-To': replyTo,
    text: `Hi,\n\nYour support ticket has been received and logged as ${ref}.\n\nSubject: ${ticket.title}\n\nWe'll be in touch shortly. To add more information, simply reply to this email.\n\nReference: ${ref}`,
    html: `<p>Hi,</p><p>Your support ticket has been received and logged as <strong>${ref}</strong>.</p><p><strong>Subject:</strong> ${ticket.title}</p><p>We'll be in touch shortly. To add more information to this ticket, simply reply to this email.</p><p><small>Reference: ${ref}</small></p>`
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
  const safeContent = commentContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  await client.messages.create(settings.mailgunDomain, {
    from: `Support <${settings.mailgunSupportEmail}>`,
    to: toEmail,
    subject: `Re: [${ref}] ${ticket.title}`,
    'h:Reply-To': replyTo,
    text: `${authorName} replied to your ticket ${ref}:\n\n${commentContent}\n\n---\nReply to this email to respond to this ticket.`,
    html: `<p><strong>${authorName}</strong> has updated your ticket <strong>${ref}</strong>:</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0"/><p>${safeContent}</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0"/><p><small>Reply to this email to respond. Reference: ${ref}</small></p>`
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
