import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getProjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query
    const projects = await prisma.project.findMany({
      where: status ? { status: status as any } : {},
      include: {
        company: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(projects)
  } catch (e) { next(e) }
}

export async function getProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        tasks: { include: { assignedTo: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { timeEntries: true } } }, orderBy: { createdAt: 'desc' } },
        timeEntries: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })
    res.json(project)
  } catch (e) { next(e) }
}

export async function createProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { members, ...data } = req.body
    const project = await prisma.project.create({
      data: {
        ...data,
        members: {
          create: [
            { userId: req.user!.id, role: 'OWNER' },
            ...(members || []).map((uid: string) => ({ userId: uid, role: 'MEMBER' })),
          ],
        },
      },
      include: { company: { select: { id: true, name: true } }, members: true },
    })
    res.status(201).json(project)
  } catch (e) { next(e) }
}

export async function updateProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body })
    res.json(project)
  } catch (e) { next(e) }
}

export async function deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
