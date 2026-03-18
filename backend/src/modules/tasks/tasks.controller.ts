import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getTasks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, priority, projectId, assignedToId } = req.query
    const tasks = await prisma.task.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(assignedToId ? { assignedToId: String(assignedToId) } : {}),
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { timeEntries: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(tasks)
  } catch (e) { next(e) }
}

export async function getTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        timeEntries: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        subTasks: true,
      },
    })
    res.json(task)
  } catch (e) { next(e) }
}

export async function createTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const task = await prisma.task.create({
      data: { ...req.body, createdById: req.user!.id },
      include: { project: { select: { id: true, name: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(task)
  } catch (e) { next(e) }
}

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data: any = { ...req.body }
    if (req.body.status === 'COMPLETED') data.completedAt = new Date()
    const task = await prisma.task.update({ where: { id: req.params.id }, data })
    res.json(task)
  } catch (e) { next(e) }
}

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
