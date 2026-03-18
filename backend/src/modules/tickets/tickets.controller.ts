import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { io } from '../../index'

export async function getTickets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, priority, assignedToId, search } = req.query
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(assignedToId ? { assignedToId: String(assignedToId) } : {}),
        ...(search ? { OR: [{ title: { contains: String(search), mode: 'insensitive' } }, { description: { contains: String(search), mode: 'insensitive' } }] } : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true, timeEntries: true } },
      },
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
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        comments: { include: { user: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } },
        timeEntries: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })
    res.json(ticket)
  } catch (e) { next(e) }
}

export async function createTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await prisma.ticket.create({
      data: { ...req.body, createdById: req.user!.id },
      include: { company: { select: { id: true, name: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    })
    io.emit('ticket:created', ticket)
    res.status(201).json(ticket)
  } catch (e) { next(e) }
}

export async function updateTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: req.body,
      include: { company: { select: { id: true, name: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    })
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
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(comments)
  } catch (e) { next(e) }
}

export async function addComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const comment = await prisma.ticketComment.create({
      data: { ...req.body, ticketId: req.params.id, userId: req.user!.id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
    io.emit('ticket:comment', comment)
    res.status(201).json(comment)
  } catch (e) { next(e) }
}
