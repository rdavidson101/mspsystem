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
    const todo = await prisma.todo.create({ data: { ...req.body, userId: req.user!.id } })
    res.status(201).json(todo)
  } catch (e) { next(e) }
}

export async function updateTodo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data: any = { ...req.body }
    if (req.body.completed === true) data.completedAt = new Date()
    else if (req.body.completed === false) data.completedAt = null
    const todo = await prisma.todo.update({ where: { id: req.params.id }, data })
    res.json(todo)
  } catch (e) { next(e) }
}

export async function deleteTodo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.todo.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
