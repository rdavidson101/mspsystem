import { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { verifyEmailToken, verifyMailgunSignature, isAutoReply } from './email.utils'
import { getMailgunSettings } from './email.service'

// Extract email address from a "Name <email>" string
function parseEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].trim() : raw.trim()
}

// Extract name from "Name <email>" string
function parseName(raw: string): string {
  const match = raw.match(/^([^<]+)</)
  return match ? match[1].trim().replace(/^"|"$/g, '') : ''
}

// Simple in-memory rate limiter for inbound email ticket creation
const inboundEmailCounts = new Map<string, { count: number; resetAt: number }>()

function checkInboundRateLimit(senderEmail: string): boolean {
  const now = Date.now()
  const key = senderEmail.toLowerCase()
  const record = inboundEmailCounts.get(key)

  if (!record || now > record.resetAt) {
    inboundEmailCounts.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 }) // 1 hour window
    return true
  }

  if (record.count >= 10) return false // Max 10 new tickets per sender per hour
  record.count++
  return true
}

export async function handleMailgunWebhook(req: Request, res: Response) {
  try {
    const body = req.body

    // Verify Mailgun signature
    const settings = await getMailgunSettings()
    const signingKey = settings.mailgunWebhookKey || process.env.MAILGUN_WEBHOOK_SECRET || ''

    // In production, signature verification is mandatory
    if (process.env.NODE_ENV === 'production' && !signingKey) {
      console.error('Mailgun webhook rejected: MAILGUN_WEBHOOK_SECRET not configured')
      return res.status(401).json({ error: 'Webhook authentication not configured' })
    }

    // Always verify if we have a key
    if (signingKey) {
      const { timestamp, token, signature } = body
      if (!timestamp || !token || !signature) {
        return res.status(401).json({ error: 'Missing webhook signature fields' })
      }
      // Check timestamp is within 5 minutes to prevent replay attacks
      const ts = parseInt(String(timestamp), 10)
      if (Math.abs(Date.now() / 1000 - ts) > 300) {
        return res.status(401).json({ error: 'Webhook timestamp expired' })
      }
      if (!verifyMailgunSignature(String(timestamp), String(token), String(signature), signingKey)) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    // Parse headers
    const rawHeaders: Record<string, string> = {}
    try {
      const parsed = typeof body['message-headers'] === 'string'
        ? JSON.parse(body['message-headers'])
        : body['message-headers'] || []
      for (const [k, v] of parsed) rawHeaders[k.toLowerCase()] = v
    } catch {}

    // Drop auto-replies
    if (isAutoReply(rawHeaders)) {
      return res.status(200).json({ skipped: true })
    }

    const recipient: string = body.recipient || body.To || ''
    const senderRaw: string = body.from || body.From || body.sender || ''
    const senderEmail = parseEmail(senderRaw)
    const senderName = parseName(senderRaw) || senderEmail
    const subject: string = body.subject || body.Subject || 'No Subject'
    // Prefer stripped-text (Mailgun removes quotes/signatures), fall back to body-plain
    const bodyText: string = (body['stripped-text'] || body['body-plain'] || '').trim()

    // Determine recipient type by matching local part prefix
    const localPart = recipient.split('@')[0] || ''

    if (localPart.startsWith('ticket+')) {
      // Reply to existing ticket
      const token = localPart.slice('ticket+'.length)
      await handleTicketReply(token, senderEmail, senderName, bodyText, res)
    } else if (localPart.startsWith('task+')) {
      // Task CC update
      const token = localPart.slice('task+'.length)
      await handleTaskUpdate(token, senderEmail, senderName, bodyText, res)
    } else {
      // Only create a new ticket if the recipient matches the configured support address
      // This prevents random emails to other addresses on the catch-all domain creating tickets
      const supportEmail = (settings.mailgunSupportEmail || '').toLowerCase().trim()
      const recipientNormalised = recipient.toLowerCase().trim()
      const supportLocalPart = supportEmail.split('@')[0] || ''

      const isSupportAddress = supportEmail &&
        (recipientNormalised === supportEmail ||
         localPart.toLowerCase() === supportLocalPart)

      if (!isSupportAddress) {
        console.log(`Webhook: discarding email to unrecognised address: ${recipient}`)
        return res.status(200).json({ skipped: true })
      }

      await handleNewTicket(senderEmail, senderName, subject, bodyText, res)
    }
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(200).json({ skipped: true })
  }
}

async function handleTicketReply(token: string, senderEmail: string, senderName: string, body: string, res: Response) {
  const payload = verifyEmailToken(token)
  if (!payload || !payload.startsWith('ticket:')) {
    return res.status(200).json({ skipped: true })
  }
  const ticketId = payload.slice('ticket:'.length)

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return res.status(200).json({ skipped: true })

  if (!body) return res.status(200).json({ skipped: true })

  // Find user by email (internal staff replying)
  const user = await prisma.user.findFirst({ where: { email: senderEmail } })
  // Find contact by email (customer replying)
  const contact = !user ? await prisma.contact.findFirst({ where: { email: senderEmail } }) : null

  // Create comment — userId is now optional
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket.id,
      userId: user?.id ?? null,
      fromEmail: user ? null : senderEmail,
      fromName: user ? null : (contact ? `${contact.firstName} ${contact.lastName}` : senderName),
      isEmail: true,
      content: body,
      type: 'REPLY',
    }
  })

  // Notify assignee if reply came from customer
  if (!user && ticket.assignedToId) {
    await prisma.notification.create({
      data: {
        userId: ticket.assignedToId,
        type: 'TICKET_REPLY',
        title: `Email reply on ${ticket.number ? `INC-${String(ticket.number).padStart(5,'0')}` : 'ticket'}`,
        body: `${senderName} replied via email: "${body.slice(0, 80)}${body.length > 80 ? '…' : ''}"`,
        link: `/tickets/INC-${String(ticket.number).padStart(5,'0')}`,
      }
    }).catch(() => {})
  }

  return res.status(200).json({ ok: true })
}

async function handleTaskUpdate(token: string, senderEmail: string, senderName: string, body: string, res: Response) {
  const payload = verifyEmailToken(token)
  if (!payload || !payload.startsWith('task:')) {
    return res.status(200).json({ skipped: true })
  }
  const parts = payload.split(':')
  const taskId = parts[1]
  const userId = parts[2]
  if (!taskId || !userId) return res.status(200).json({ skipped: true })

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, number: true, name: true } } }
  })
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!task || !user) return res.status(200).json({ skipped: true })

  if (!body) return res.status(200).json({ skipped: true })

  // Store the email body as JSON matching the task comment format used in createTaskComment
  const commentContent = JSON.stringify({ text: body, images: [], mentionedIds: [], references: [], source: 'email' })

  const comment = await prisma.taskComment.create({
    data: {
      taskId: task.id,
      userId: user.id,
      content: commentContent,
      isEmail: true,
      fromEmail: senderEmail,
    }
  })

  if (comment && task.project) {
    // Notify task assignee if different from sender
    if (task.assignedToId && task.assignedToId !== userId) {
      await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          type: 'TASK_MENTION',
          title: `Email update on task "${task.title}"`,
          body: `${user.firstName} ${user.lastName} added an update via email`,
          link: `/projects/PRJ-${String(task.project.number).padStart(5,'0')}?task=${task.id}`,
        }
      }).catch(() => {})
    }
  }

  return res.status(200).json({ ok: true })
}

async function handleNewTicket(senderEmail: string, senderName: string, subject: string, body: string, res: Response) {
  // Find contact by sender email
  const contact = await prisma.contact.findFirst({
    where: { email: senderEmail },
    include: { company: { select: { id: true, isActive: true, serviceTeamId: true } } }
  })

  // If no contact found, check if sender is an internal user
  const internalUser = !contact ? await prisma.user.findFirst({
    where: { email: senderEmail, userType: 'INTERNAL' }
  }) : null

  if (!contact && !internalUser) {
    // Unknown sender — reject silently (strict mode)
    console.log(`Rejected email from unknown sender: ${senderEmail}`)
    return res.status(200).json({ skipped: true })
  }

  if (contact?.company && !contact.company.isActive) {
    return res.status(200).json({ skipped: true })
  }

  // Rate limit new ticket creation per sender
  if (!checkInboundRateLimit(senderEmail)) {
    console.warn(`Inbound rate limit exceeded for ${senderEmail}`)
    return res.status(200).json({ skipped: true })
  }

  // For internal users, create ticket under MSP company
  const mspCompany = internalUser ? await prisma.company.findFirst({ where: { isInternal: true } }) : null

  const ticket = await prisma.ticket.create({
    data: {
      title: subject.replace(/^(Re:|Fwd?:)\s*/i, '').trim() || 'Support Request',
      description: body || '',
      status: 'AWAITING_TRIAGE',
      priority: 'MEDIUM',
      companyId: contact?.companyId ?? mspCompany?.id ?? undefined,
      contactId: contact?.id ?? undefined,
      serviceTeamId: contact?.company?.serviceTeamId ?? undefined,
      source: 'EMAIL',
      ...(internalUser ? { createdById: internalUser.id } : {}),
    }
  })

  // Send confirmation
  const { sendTicketConfirmation } = await import('./email.service')
  await sendTicketConfirmation(ticket, senderEmail)

  // Notify service team members
  if (ticket.serviceTeamId) {
    const teamMembers = await prisma.serviceTeamMember.findMany({
      where: { teamId: ticket.serviceTeamId }
    })
    await Promise.all(teamMembers.map(m =>
      prisma.notification.create({
        data: {
          userId: m.userId,
          type: 'TICKET_CREATED',
          title: `New ticket via email: INC-${String(ticket.number).padStart(5,'0')}`,
          body: `${senderName} raised a ticket: "${ticket.title}"`,
          link: `/tickets/INC-${String(ticket.number).padStart(5,'0')}`,
        }
      }).catch(() => {})
    ))
  }

  return res.status(200).json({ ok: true, ticketId: ticket.id })
}
