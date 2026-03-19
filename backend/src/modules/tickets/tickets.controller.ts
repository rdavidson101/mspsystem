import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'
import { io } from '../../index'

async function createNotification(userId: string, type: string, title: string, body: string, ticketId: string) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, ticketId } })
  } catch (e) {
    console.error('Failed to create notification:', e)
  }
}

const TICKET_INCLUDE = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  category: { select: { id: true, name: true, color: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
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
    const { status, priority, assignedToId, categoryId, search } = req.query
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(assignedToId ? { assignedToId: String(assignedToId) } : {}),
        ...(categoryId ? { categoryId: String(categoryId) } : {}),
        ...(search ? { OR: [
          { title: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
        ]} : {}),
      },
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

    const ticket = await prisma.ticket.create({
      data: { ...req.body, createdById: req.user!.id, slaResolutionDue, slaResponseDue },
      include: TICKET_INCLUDE,
    })
    await recordHistory(ticket.id, req.user!.id, [
      { field: 'status', oldValue: null, newValue: 'AWAITING_TRIAGE' },
      { field: 'priority', oldValue: null, newValue: ticket.priority },
    ])
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

    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = []

    if (req.body.status && req.body.status !== current.status) {
      changes.push({ field: 'status', oldValue: current.status, newValue: req.body.status })
    }
    if (req.body.priority && req.body.priority !== current.priority) {
      changes.push({ field: 'priority', oldValue: current.priority, newValue: req.body.priority })
    }
    if ('assignedToId' in req.body && req.body.assignedToId !== current.assignedToId) {
      const oldName = current.assignedTo ? `${current.assignedTo.firstName} ${current.assignedTo.lastName}` : 'Unassigned'
      // Fetch new assignee name if set
      let newName = 'Unassigned'
      if (req.body.assignedToId) {
        const u = await prisma.user.findUnique({ where: { id: req.body.assignedToId }, select: { firstName: true, lastName: true } })
        if (u) newName = `${u.firstName} ${u.lastName}`
      }
      changes.push({ field: 'assignedTo', oldValue: oldName, newValue: newName })
    }
    if ('categoryId' in req.body && req.body.categoryId !== current.categoryId) {
      const oldCat = current.category?.name || 'None'
      let newCat = 'None'
      if (req.body.categoryId) {
        const c = await prisma.ticketCategory.findUnique({ where: { id: req.body.categoryId }, select: { name: true } })
        if (c) newCat = c.name
      }
      changes.push({ field: 'category', oldValue: oldCat, newValue: newCat })
    }
    if (req.body.title && req.body.title !== current.title) {
      changes.push({ field: 'title', oldValue: current.title, newValue: req.body.title })
    }

    // Auto-set resolvedAt
    const data: any = { ...req.body }
    if (req.body.status === 'RESOLVED' && !current.resolvedAt) data.resolvedAt = new Date()
    else if (req.body.status && req.body.status !== 'RESOLVED') data.resolvedAt = null

    if (req.body.priority && req.body.priority !== current.priority) {
      const newSlaPolicy = await prisma.slaPolicy.findUnique({ where: { priority: req.body.priority } })
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
    if (ticket.assignedToId && ticket.assignedToId !== req.user!.id && 'assignedToId' in req.body && req.body.assignedToId !== current.assignedToId) {
      await createNotification(
        ticket.assignedToId,
        'TICKET_ASSIGNED',
        `Ticket assigned to you`,
        `${ticketRef(ticket.number)} – ${ticket.title} has been assigned to you`,
        ticket.id
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
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, select: { id: true, number: true, title: true, assignedToId: true } })
    const comment = await prisma.ticketComment.create({
      data: { ...req.body, ticketId: req.params.id, userId: req.user!.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
    })
    if (ticket && ticket.assignedToId && ticket.assignedToId !== req.user!.id) {
      await createNotification(
        ticket.assignedToId,
        'TICKET_UPDATED',
        `New reply on ${ticketRef(ticket.number)}`,
        `${req.user!.email} replied to "${ticket.title}"`,
        ticket.id
      )
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
