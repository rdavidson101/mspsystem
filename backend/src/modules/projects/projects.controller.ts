import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

const projectInclude = {
  company: { select: { id: true, name: true } },
  members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } } },
  sections: {
    orderBy: { order: 'asc' as const },
    include: {
      tasks: {
        where: { parentTaskId: null },
        orderBy: { order: 'asc' as const },
        include: {
          assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
          subTasks: {
            orderBy: { order: 'asc' as const },
            include: {
              assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
              activeTimers: true,
              _count: { select: { comments: true } },
            },
          },
          activeTimers: true,
          _count: { select: { comments: true } },
        },
      },
    },
  },
}

export async function getProjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user!
    const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER'
    const where: any = isAdmin ? {} : {
      members: { some: { userId: user.id } }
    }
    if (req.query.status) where.status = req.query.status
    const projects = await prisma.project.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        _count: { select: { tasks: true, sections: true } },
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
      include: projectInclude,
    })
    if (!project) throw new AppError(404, 'Project not found')
    res.json(project)
  } catch (e) { next(e) }
}

export async function createProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, status, startDate, endDate, budget, companyId, memberIds } = req.body
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status: status || 'PLANNING',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? Number(budget) : null,
        companyId: companyId || null,
        members: {
          create: [
            { userId: req.user!.id, role: 'OWNER' },
            ...((memberIds || []).filter((id: string) => id !== req.user!.id).map((uid: string) => ({ userId: uid, role: 'MEMBER' }))),
          ],
        },
      },
      include: {
        company: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        _count: { select: { tasks: true, sections: true } },
      },
    })
    res.status(201).json(project)
  } catch (e) { next(e) }
}

export async function updateProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, status, startDate, endDate, budget, companyId } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    if (status !== undefined) data.status = status
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
    if (budget !== undefined) data.budget = budget ? Number(budget) : null
    if (companyId !== undefined) data.companyId = companyId || null
    const project = await prisma.project.update({ where: { id: req.params.id }, data })
    res.json(project)
  } catch (e) { next(e) }
}

export async function deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function addMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req.body
    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.id, userId } },
      update: { role: role || 'MEMBER' },
      create: { projectId: req.params.id, userId, role: role || 'MEMBER' },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    })
    res.json(member)
  } catch (e) { next(e) }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } },
    })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function createSection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, color } = req.body
    const lastSection = await prisma.section.findFirst({
      where: { projectId: req.params.id },
      orderBy: { order: 'desc' },
    })
    const section = await prisma.section.create({
      data: {
        projectId: req.params.id,
        name: name || 'New Section',
        color: color || '#6366f1',
        order: (lastSection?.order ?? -1) + 1,
      },
      include: { tasks: true },
    })
    res.status(201).json(section)
  } catch (e) { next(e) }
}

export async function updateSection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, color, collapsed, order } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (color !== undefined) data.color = color
    if (collapsed !== undefined) data.collapsed = collapsed
    if (order !== undefined) data.order = order
    const section = await prisma.section.update({ where: { id: req.params.sectionId }, data })
    res.json(section)
  } catch (e) { next(e) }
}

export async function deleteSection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.section.delete({ where: { id: req.params.sectionId } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function reorderSections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { orders } = req.body // [{id, order}]
    await Promise.all(orders.map(({ id, order }: { id: string; order: number }) =>
      prisma.section.update({ where: { id }, data: { order } })
    ))
    res.json({ success: true })
  } catch (e) { next(e) }
}
