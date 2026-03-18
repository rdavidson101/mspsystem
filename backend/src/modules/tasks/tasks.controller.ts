import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

const taskInclude = {
  assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  section: { select: { id: true, name: true, color: true } },
  activeTimers: true,
  _count: { select: { comments: true } },
}

async function getTaskTotalTime(taskId: string): Promise<number> {
  const result = await prisma.timeEntry.aggregate({
    where: { taskId },
    _sum: { hours: true },
  })
  return result._sum.hours || 0
}

export async function getTasks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, projectId, assignedToId, sectionId } = req.query
    const tasks = await prisma.task.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(sectionId ? { sectionId: String(sectionId) } : {}),
        parentTaskId: null,
      },
      include: {
        ...taskInclude,
        subTasks: { include: taskInclude, orderBy: { order: 'asc' } },
      },
      orderBy: [{ sectionId: 'asc' }, { order: 'asc' }],
    })
    res.json(tasks)
  } catch (e) { next(e) }
}

export async function getTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        ...taskInclude,
        subTasks: { include: taskInclude, orderBy: { order: 'asc' } },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!task) throw new AppError(404, 'Task not found')
    const totalHours = await getTaskTotalTime(task.id)
    res.json({ ...task, totalHours })
  } catch (e) { next(e) }
}

export async function createTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, status, assigneeIds, projectId, sectionId, parentTaskId, dueDate, startDate, order, estimatedHours } = req.body
    const lastTask = await prisma.task.findFirst({
      where: { sectionId: sectionId || null, parentTaskId: parentTaskId || null },
      orderBy: { order: 'desc' },
    })
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'NOT_STARTED',
        projectId: projectId || null,
        sectionId: sectionId || null,
        parentTaskId: parentTaskId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        order: order ?? (lastTask?.order ?? -1) + 1,
        createdById: req.user!.id,
        assignees: assigneeIds?.length ? {
          create: assigneeIds.map((uid: string) => ({ userId: uid })),
        } : undefined,
      },
      include: {
        ...taskInclude,
        subTasks: { include: taskInclude },
      },
    })
    res.status(201).json(task)
  } catch (e) { next(e) }
}

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, status, assigneeIds, sectionId, dueDate, startDate, order, priority, estimatedHours } = req.body
    const data: any = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description || null
    if (status !== undefined) data.status = status
    if (sectionId !== undefined) data.sectionId = sectionId || null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (order !== undefined) data.order = order
    if (priority !== undefined) data.priority = priority
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? Number(estimatedHours) : null
    if (status === 'DONE') data.completedAt = new Date()

    // Handle multiple assignees
    if (assigneeIds !== undefined) {
      data.assignees = {
        deleteMany: {},
        create: (assigneeIds as string[]).map((uid: string) => ({ userId: uid })),
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        ...taskInclude,
        subTasks: { include: taskInclude },
      },
    })
    res.json(task)
  } catch (e) { next(e) }
}

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function reorderTasks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { orders } = req.body // [{id, order, sectionId?}]
    await Promise.all(orders.map(({ id, order, sectionId }: any) =>
      prisma.task.update({ where: { id }, data: { order, ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}) } })
    ))
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function getTaskComments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const comments = await prisma.taskComment.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(comments)
  } catch (e) { next(e) }
}

export async function createTaskComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { content } = req.body
    const comment = await prisma.taskComment.create({
      data: { taskId: req.params.id, userId: req.user!.id, content },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    })

    // Read mentionedIds array from the JSON payload
    const mentionedUserIds = new Set<string>()
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.mentionedIds)) {
        parsed.mentionedIds.forEach((uid: string) => {
          if (uid !== req.user!.id) mentionedUserIds.add(uid)
        })
      }
    } catch {}

    if (mentionedUserIds.size > 0) {
      const task = await prisma.task.findUnique({
        where: { id: req.params.id },
        select: { title: true, projectId: true },
      })
      const mentioner = `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || 'Someone'
      await prisma.notification.createMany({
        data: Array.from(mentionedUserIds).map(uid => ({
          userId: uid,
          type: 'TASK_MENTION',
          title: `${mentioner} mentioned you`,
          body: `You were mentioned in a comment on "${task?.title || 'a task'}"`,
          link: task?.projectId ? `/projects/${task.projectId}` : null,
        })),
      })
    }

    res.status(201).json(comment)
  } catch (e) { next(e) }
}

export async function deleteTaskComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const comment = await prisma.taskComment.findUnique({ where: { id: req.params.commentId } })
    if (!comment) throw new AppError(404, 'Comment not found')
    if (comment.userId !== req.user!.id && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized')
    await prisma.taskComment.delete({ where: { id: req.params.commentId } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function startTimer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const timer = await prisma.activeTimer.upsert({
      where: { taskId_userId: { taskId: req.params.id, userId: req.user!.id } },
      update: { startedAt: new Date() },
      create: { taskId: req.params.id, userId: req.user!.id },
    })
    res.json(timer)
  } catch (e) { next(e) }
}

export async function stopTimer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const timer = await prisma.activeTimer.findUnique({
      where: { taskId_userId: { taskId: req.params.id, userId: req.user!.id } },
    })
    if (!timer) throw new AppError(404, 'No active timer found')

    const durationSeconds = Math.floor((Date.now() - timer.startedAt.getTime()) / 1000)
    const hours = Math.max(durationSeconds / 3600, 1 / 3600) // minimum 1 second

    // Get task to find projectId
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { projectId: true } })

    await prisma.timeEntry.create({
      data: {
        hours,
        taskId: req.params.id,
        projectId: task?.projectId || null,
        userId: req.user!.id,
        description: `Timer session (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`,
        date: new Date(),
        billable: true,
      },
    })
    await prisma.activeTimer.delete({ where: { taskId_userId: { taskId: req.params.id, userId: req.user!.id } } })

    // Return updated total time
    const totalHours = await getTaskTotalTime(req.params.id)
    res.json({ success: true, durationSeconds, totalHours })
  } catch (e) { next(e) }
}

export async function getTimer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const timer = await prisma.activeTimer.findUnique({
      where: { taskId_userId: { taskId: req.params.id, userId: req.user!.id } },
    })
    const totalHours = await getTaskTotalTime(req.params.id)
    res.json({ timer: timer || null, totalHours })
  } catch (e) { next(e) }
}

export async function getTaskTimeByUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const grouped = await prisma.timeEntry.groupBy({
      by: ['userId'],
      where: { taskId: req.params.id },
      _sum: { hours: true },
    })
    if (grouped.length === 0) return res.json([])
    const userIds = grouped.map(e => e.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    })
    // Also include users with an active timer (show session in progress)
    const activeTimers = await prisma.activeTimer.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    })
    const result = grouped.map(e => ({
      user: users.find(u => u.id === e.userId),
      hours: e._sum.hours || 0,
      activeTimer: activeTimers.find(t => t.userId === e.userId) || null,
    }))
    // Add users who only have active timers (no logged entries yet)
    for (const at of activeTimers) {
      if (!result.find(r => r.user?.id === at.userId)) {
        result.push({ user: at.user, hours: 0, activeTimer: at })
      }
    }
    res.json(result)
  } catch (e) { next(e) }
}

export async function getTaskAttachments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { taskId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(attachments)
  } catch (e) { next(e) }
}

export async function createTaskAttachment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, url, size, mimeType } = req.body
    const attachment = await prisma.attachment.create({
      data: { name, url, size: Number(size), mimeType, taskId: req.params.id },
    })
    res.status(201).json(attachment)
  } catch (e) { next(e) }
}

export async function deleteTaskAttachment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.attachment.delete({ where: { id: req.params.attachmentId } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
