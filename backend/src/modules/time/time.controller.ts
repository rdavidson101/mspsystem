import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getTimeEntries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId: requestedUserId, ticketId, taskId, projectId, startDate, endDate } = req.query
    const effectiveUserId = (req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER')
      ? (requestedUserId ? String(requestedUserId) : req.user!.id)
      : req.user!.id
    const entries = await prisma.timeEntry.findMany({
      where: {
        userId: effectiveUserId,
        ...(ticketId ? { ticketId: String(ticketId) } : {}),
        ...(taskId ? { taskId: String(taskId) } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(startDate && endDate ? { date: { gte: new Date(String(startDate)), lte: new Date(String(endDate)) } } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        ticket: { select: { id: true, number: true, title: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })
    res.json(entries)
  } catch (e) { next(e) }
}

export async function createTimeEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { hours, description, date, projectId, taskId, billable } = req.body
    if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) {
      return res.status(400).json({ message: 'Valid hours required' })
    }
    const entry = await prisma.timeEntry.create({
      data: {
        hours: Number(hours),
        description: description?.trim() || null,
        date: date ? new Date(date) : new Date(),
        projectId: projectId || null,
        taskId: taskId || null,
        billable: Boolean(billable),
        userId: req.user!.id,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(entry)
  } catch (e) { next(e) }
}

export async function updateTimeEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ message: 'Not found' })
    if (entry.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const { hours, description, date, billable } = req.body
    const data: any = {}
    if (hours !== undefined) data.hours = Number(hours)
    if (description !== undefined) data.description = description?.trim() || null
    if (date !== undefined) data.date = new Date(date)
    if (billable !== undefined) data.billable = Boolean(billable)
    const updated = await prisma.timeEntry.update({ where: { id: req.params.id }, data })
    res.json(updated)
  } catch (e) { next(e) }
}

export async function deleteTimeEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ message: 'Not found' })
    if (entry.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    await prisma.timeEntry.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
