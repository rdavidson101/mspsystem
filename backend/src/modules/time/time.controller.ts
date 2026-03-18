import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getTimeEntries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, ticketId, taskId, projectId, startDate, endDate } = req.query
    const entries = await prisma.timeEntry.findMany({
      where: {
        ...(userId ? { userId: String(userId) } : {}),
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
    const entry = await prisma.timeEntry.create({
      data: { ...req.body, userId: req.user!.id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(entry)
  } catch (e) { next(e) }
}

export async function updateTimeEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await prisma.timeEntry.update({ where: { id: req.params.id }, data: req.body })
    res.json(entry)
  } catch (e) { next(e) }
}

export async function deleteTimeEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.timeEntry.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
