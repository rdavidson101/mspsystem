import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'
import { io } from '../../index'
import { sendTicketUpdate, sendTicketConfirmation } from '../email/email.service'

async function createNotification(userId: string, type: string, title: string, body: string, ticketId: string, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, ticketId, link } })
  } catch (e) {
    console.error('Failed to create notification:', e)
  }
}

const TICKET_INCLUDE = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true, title: true } },
  category: { select: { id: true, name: true, color: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  serviceTeam: { select: { id: true, name: true } },
  _count: { select: { comments: true, timeEntries: true } },
}

export function ticketRef(number: number) {
  return `INC-${String(number).padStart(5, '0')}`
}

async function recordHistory(
  ticketId: string,
  userId: string,
  changes: { field: string; oldValue: string | null; newValue: string | null }[]
) {
  if (changes.length === 0) return
  await prisma.ticketHistory.createMany({
    data: changes.map(c => ({ ticketId, userId, ...c })),
  })
}

export async function getTickets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, priority, assignedToId, categoryId, search, companyId, createdById, createdAtFrom, createdAtTo, resolvedAtFrom, resolvedAtTo, serviceTeamId, active } = req.query

    const where: any = {}
    if (active === 'true') where.status = { not: 'CLOSED' }
    else if (status) where.status = status as any
    if (priority) where.priority = priority as any
    if (assignedToId) where.assignedToId = String(assignedToId)
    if (categoryId) where.categoryId = String(categoryId)
    if (companyId) where.companyId = String(companyId)
    if (createdById) where.createdById = String(createdById)
    if (serviceTeamId) where.serviceTeamId = String(serviceTeamId)
    if (search) where.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { description: { contains: String(search), mode: 'insensitive' } },
    ]
    if (createdAtFrom || createdAtTo) {
      where.createdAt = {}
      if (createdAtFrom) where.createdAt.gte = new Date(String(createdAtFrom))
      if (createdAtTo) where.createdAt.lte = new Date(String(createdAtTo))
    }
    if (resolvedAtFrom || resolvedAtTo) {
      where.resolvedAt = {}
      if (resolvedAtFrom) where.resolvedAt.gte = new Date(String(resolvedAtFrom))
      if (resolvedAtTo) where.resolvedAt.lte = new Date(String(resolvedAtTo))
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: TICKET_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    res.json(tickets)
  } catch (e) { next(e) }
}

export async function getTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        contact: true,
        category: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true } },
        serviceTeam: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
          orderBy: { createdAt: 'asc' },
        },
        timeEntries: {
          include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
        },
      },
    })
    res.json(ticket)
  } catch (e) { next(e) }
}

export async function createTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.body
    if (companyId) {
      const co = await prisma.company.findUnique({ where: { id: companyId } })
      if (co && !co.isActive) throw new AppError(400, 'This customer is disabled and cannot have new items created.')
    }
    const priority = req.body.priority || 'MEDIUM'
    const slaPolicy = await prisma.slaPolicy.findUnique({ where: { priority } })
    const now = new Date()
    const slaResolutionDue = slaPolicy ? new Date(now.getTime() + slaPolicy.resolutionTime * 60000) : undefined
    const slaResponseDue = slaPolicy ? new Date(now.getTime() + slaPolicy.responseTime * 60000) : undefined

    let serviceTeamId: string | undefined
    if (req.body.companyId) {
      const co = await prisma.company.findUnique({ where: { id: req.body.companyId }, select: { serviceTeamId: true } })
      if (co?.serviceTeamId) serviceTeamId = co.serviceTeamId
    }

    const { title, description, categoryId, assignedToId, dueDate, tags } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority) ? priority : 'MEDIUM',
        categoryId: categoryId || null,
        companyId: companyId || null,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: Array.isArray(tags) ? tags : [],
        createdById: req.user!.id,
        slaResolutionDue,
        slaResponseDue,
        ...(serviceTeamId ? { serviceTeamId } : {}),
      },
      include: TICKET_INCLUDE,
    })
    await recordHistory(ticket.id, req.user!.id, [
      { field: 'status', oldValue: null, newValue: 'AWAITING_TRIAGE' },
      { field: 'priority', oldValue: null, newValue: ticket.priority },
    ])

    // Send confirmation email to reporter if they have a contact with email
    const reporterContact = await prisma.contact.findFirst({
      where: { email: req.user!.email },
      select: { email: true },
    })
    if (reporterContact?.email) {
      sendTicketConfirmation(ticket, reporterContact.email).catch(err => console.error('Email error:', err))
    }

    io.emit('ticket:created', ticket)
    res.status(201).json(ticket)
  } catch (e) { next(e) }
}

export async function updateTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const current = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } },
      },
    })
    if (!current) return res.status(404).json({ error: 'Ticket not found' })

    // Whitelist allowed update fields
    const {
      title, description, priority, status, categoryId, companyId,
      assignedToId, dueDate, tags, serviceTeamId, resolvedAt,
    } = req.body

    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = []

    if (status && status !== current.status) {
      changes.push({ field: 'status', oldValue: current.status, newValue: status })
    }
    if (priority && priority !== current.priority) {
      changes.push({ field: 'priority', oldValue: current.priority, newValue: priority })
    }
    if ('assignedToId' in req.body && assignedToId !== current.assignedToId) {
      const oldName = current.assignedTo ? `${current.assignedTo.firstName} ${current.assignedTo.lastName}` : 'Unassigned'
      // Fetch new assignee name if set
      let newName = 'Unassigned'
      if (assignedToId) {
        const u = await prisma.user.findUnique({ where: { id: assignedToId }, select: { firstName: true, lastName: true } })
        if (u) newName = `${u.firstName} ${u.lastName}`
      }
      changes.push({ field: 'assignedTo', oldValue: oldName, newValue: newName })
    }
    if ('categoryId' in req.body && categoryId !== current.categoryId) {
      const oldCat = current.category?.name || 'None'
      let newCat = 'None'
      if (categoryId) {
        const c = await prisma.ticketCategory.findUnique({ where: { id: categoryId }, select: { name: true } })
        if (c) newCat = c.name
      }
      changes.push({ field: 'category', oldValue: oldCat, newValue: newCat })
    }
    if (title && title !== current.title) {
      changes.push({ field: 'title', oldValue: current.title, newValue: title })
    }

    const data: any = {}
    if (title !== undefined) data.title = String(title).trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (priority !== undefined && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) data.priority = priority
    if (status !== undefined) data.status = status
    if (categoryId !== undefined) data.categoryId = categoryId || null
    if (companyId !== undefined) data.companyId = companyId || null
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : []
    if (serviceTeamId !== undefined) data.serviceTeamId = serviceTeamId || null
    if (resolvedAt !== undefined) data.resolvedAt = resolvedAt ? new Date(resolvedAt) : null

    // Auto-set resolvedAt
    if (status === 'RESOLVED' && !current.resolvedAt) data.resolvedAt = new Date()
    else if (status && status !== 'RESOLVED') data.resolvedAt = null

    if (priority && priority !== current.priority) {
      const newSlaPolicy = await prisma.slaPolicy.findUnique({ where: { priority } })
      if (newSlaPolicy) {
        const createdAt = new Date(current.createdAt)
        data.slaResolutionDue = new Date(createdAt.getTime() + newSlaPolicy.resolutionTime * 60000)
        data.slaResponseDue = new Date(createdAt.getTime() + newSlaPolicy.responseTime * 60000)
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: TICKET_INCLUDE,
    })

    await recordHistory(ticket.id, req.user!.id, changes)
    if (ticket.assignedToId && ticket.assignedToId !== req.user!.id && 'assignedToId' in req.body && assignedToId !== current.assignedToId) {
      await createNotification(
        ticket.assignedToId,
        'TICKET_ASSIGNED',
        `Ticket assigned to you`,
        `${ticketRef(ticket.number)} – ${ticket.title} has been assigned to you`,
        ticket.id,
        '/tickets/' + ticketRef(ticket.number)
      )
    }
    io.emit('ticket:updated', ticket)
    res.json(ticket)
  } catch (e) { next(e) }
}

export async function deleteTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } })
    io.emit('ticket:deleted', { id: req.params.id })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function getComments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(comments)
  } catch (e) { next(e) }
}

export async function addComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, number: true, title: true, assignedToId: true, companyId: true, createdById: true, contactId: true }
    })
    const { content, isInternal, mentionedUserIds: rawMentions } = req.body
    const comment = await prisma.ticketComment.create({
      data: { content, isInternal: isInternal ?? false, ticketId: req.params.id, userId: req.user!.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
    })
    if (ticket && ticket.assignedToId && ticket.assignedToId !== req.user!.id) {
      await createNotification(
        ticket.assignedToId,
        'TICKET_UPDATED',
        `New reply on ${ticketRef(ticket.number)}`,
        `${req.user!.email} replied to "${ticket.title}"`,
        ticket.id,
        '/tickets/' + ticketRef(ticket.number)
      )
    }
    const mentionedUserIds: string[] = Array.isArray(rawMentions) ? rawMentions : []
    for (const mentionedId of mentionedUserIds) {
      if (mentionedId !== req.user!.id) {
        await createNotification(
          mentionedId,
          'MENTION',
          `You were mentioned in ${ticketRef(ticket!.number)}`,
          `${req.user!.email} mentioned you in "${ticket!.title}"`,
          req.params.id,
          '/tickets/' + ticketRef(ticket!.number)
        )
      }
    }

    // Send email notification to the ticket reporter (fire and forget)
    if (ticket && !isInternal) {
      let reporterEmail: string | null = null
      if (ticket.createdById) {
        const reporter = await prisma.user.findUnique({
          where: { id: ticket.createdById },
          select: { email: true },
        })
        reporterEmail = reporter?.email ?? null
      } else if (ticket.contactId) {
        const contact = await prisma.contact.findUnique({
          where: { id: ticket.contactId },
          select: { email: true },
        })
        reporterEmail = contact?.email ?? null
      }
      if (reporterEmail && reporterEmail !== req.user!.email) {
        const authorName = `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || 'Support Team'
        sendTicketUpdate(ticket, content, reporterEmail, authorName).catch(err => console.error('Email error:', err))
      }
    }

    io.emit('ticket:comment', comment)
    res.status(201).json(comment)
  } catch (e) { next(e) }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const history = await prisma.ticketHistory.findMany({
      where: { ticketId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(history)
  } catch (e) { next(e) }
}
