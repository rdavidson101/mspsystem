import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getTodos(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    })
    res.json(todos)
  } catch (e) { next(e) }
}

export async function createTodo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, dueDate, priority, tags } = req.body
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' })
    const todo = await prisma.todo.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        tags: Array.isArray(tags) ? tags : [],
        userId: req.user!.id,
      }
    })
    res.status(201).json(todo)
  } catch (e) { next(e) }
}

export async function updateTodo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const todo = await prisma.todo.findUnique({ where: { id: req.params.id } })
    if (!todo) return res.status(404).json({ message: 'Not found' })
    if (todo.userId !== req.user!.id) return res.status(403).json({ message: 'Forbidden' })

    const { title, description, completed, dueDate, priority, tags } = req.body
    const data: any = {}
    if (title !== undefined) data.title = String(title).trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (completed !== undefined) {
      data.completed = Boolean(completed)
      data.completedAt = Boolean(completed) ? new Date() : null
    }
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (priority !== undefined) data.priority = priority
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : []
    const updated = await prisma.todo.update({ where: { id: req.params.id }, data })
    res.json(updated)
  } catch (e) { next(e) }
}

export async function deleteTodo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const todo = await prisma.todo.findUnique({ where: { id: req.params.id } })
    if (!todo) return res.status(404).json({ message: 'Not found' })
    if (todo.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    await prisma.todo.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
