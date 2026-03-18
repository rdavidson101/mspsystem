import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

const templateInclude = {
  sections: {
    orderBy: { order: 'asc' as const },
    include: {
      tasks: {
        where: { parentTaskId: null },
        orderBy: { order: 'asc' as const },
        include: {
          subTasks: { orderBy: { order: 'asc' as const } },
        },
      },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
}

export async function getTemplates(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const templates = await prisma.projectTemplate.findMany({
      include: templateInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json(templates)
  } catch (e) { next(e) }
}

export async function getTemplate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const template = await prisma.projectTemplate.findUnique({
      where: { id: req.params.id },
      include: templateInclude,
    })
    if (!template) return res.status(404).json({ message: 'Template not found' })
    res.json(template)
  } catch (e) { next(e) }
}

export async function createTemplateFromProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params
    const { name, description } = req.body

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              where: { parentTaskId: null },
              orderBy: { order: 'asc' },
              include: {
                subTasks: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    })
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const template = await prisma.projectTemplate.create({
      data: {
        name: name || `${project.name} Template`,
        description: description || project.description || null,
        createdById: req.user!.id,
        sections: {
          create: project.sections.map((section, si) => ({
            name: section.name,
            color: section.color,
            order: si,
            tasks: {
              create: section.tasks.map((task, ti) => ({
                title: task.title,
                description: task.description,
                estimatedHours: task.estimatedHours,
                order: ti,
                subTasks: {
                  create: (task.subTasks || []).map((sub, subi) => ({
                    title: sub.title,
                    description: sub.description,
                    estimatedHours: sub.estimatedHours,
                    order: subi,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: templateInclude,
    })

    res.status(201).json(template)
  } catch (e) { next(e) }
}

export async function updateTemplate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    const template = await prisma.projectTemplate.update({
      where: { id: req.params.id },
      data,
      include: templateInclude,
    })
    res.json(template)
  } catch (e) { next(e) }
}

export async function deleteTemplate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.projectTemplate.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
